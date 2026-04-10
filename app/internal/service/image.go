package service

import (
	"bytes"
	"context"
	"database/sql"
	"docker-pull-manager/internal/config"
	"docker-pull-manager/internal/database"
	"docker-pull-manager/internal/docker"
	"docker-pull-manager/internal/models"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

type ImageService struct {
	db      *sql.DB
	docker  *docker.DockerService
	cfg     *config.Config
	webhook *WebhookService
}

func NewImageService(db *sql.DB, dockerSvc *docker.DockerService, cfg *config.Config, webhookSvc *WebhookService) *ImageService {
	return &ImageService{
		db:      db,
		docker:  dockerSvc,
		cfg:     cfg,
		webhook: webhookSvc,
	}
}

func (s *ImageService) CreateImage(req *models.CreateImageRequest) (*models.Image, error) {
	// Set defaults
	name := req.Name
	tag := req.Tag
	platform := req.Platform

	if tag == "" {
		tag = "latest"
	}
	if platform == "" {
		// Use first platform from DefaultPlatform if it's comma-separated
		if s.cfg.DefaultPlatform != "" {
			platforms := strings.Split(s.cfg.DefaultPlatform, ",")
			platform = strings.TrimSpace(platforms[0])
		}
		if platform == "" {
			platform = "linux/amd64"
		}
	}

	// Check for duplicates: same name + tag + platform with pending/pulling status
	existingImage, err := database.GetImageByNameTagPlatform(s.db, name, tag, platform)
	if err != nil {
		return nil, fmt.Errorf("failed to check for duplicates: %w", err)
	}
	if existingImage != nil {
		return nil, fmt.Errorf("image %s:%s (%s) already exists with status %s", name, tag, platform, existingImage.Status)
	}

	image := &models.Image{
		Name:         name,
		Tag:          tag,
		Platform:     platform,
		Status:       "pending",
		IsAutoExport: req.IsAutoExport,
	}

	err = database.CreateImage(s.db, image)
	if err != nil {
		return nil, err
	}

	s.logAction(image.ID, "CREATE", fmt.Sprintf("Created image %s:%s", image.Name, image.Tag))

	return image, nil
}

func (s *ImageService) ProcessPendingImages() {
	images, err := database.GetPendingImages(s.db)
	if err != nil {
		return
	}

	for _, img := range images {
		s.processImage(&img)
	}
}

func (s *ImageService) processImage(img *models.Image) {
	ctx := context.Background()

	database.UpdateImageStatus(s.db, img.ID, "pulling", "")
	s.logAction(img.ID, "PULL_START", fmt.Sprintf("Starting pull for %s", img.FullName))

	err := s.docker.PullImage(ctx, img.FullName, img.Platform)
	if err != nil {
		database.IncrementRetryCount(s.db, img.ID)
		shouldRetry := s.cfg.RetryMaxAttempts == 0 || img.RetryCount < s.cfg.RetryMaxAttempts

		if shouldRetry {
			database.UpdateImageStatus(s.db, img.ID, "failed", err.Error())
			s.logAction(img.ID, "PULL_FAILED", fmt.Sprintf("Pull failed: %v (retry %d)", err, img.RetryCount+1))
		} else {
			database.UpdateImageStatus(s.db, img.ID, "failed", "Max retry attempts reached")
			s.logAction(img.ID, "PULL_FAILED", fmt.Sprintf("Pull failed permanently: %v", err))
		}
		// Send webhook notification for pull failure
		if s.webhook != nil {
			s.webhook.SendNotification("Docker Pull Manager", fmt.Sprintf("❌ Pull failed: %s (%s) - %v", img.FullName, img.Platform, err))
		}
		return
	}

	database.UpdateImageStatus(s.db, img.ID, "success", "")
	s.logAction(img.ID, "PULL_SUCCESS", fmt.Sprintf("Successfully pulled %s", img.FullName))

	// Send webhook notification for successful pull
	if s.webhook != nil {
		s.webhook.SendNotification("Docker Pull Manager", fmt.Sprintf("✅ Pull succeeded: %s (%s)", img.FullName, img.Platform))
	}

	if img.IsAutoExport {
		s.ExportImage(img.ID)
	}
}

func (s *ImageService) ExportImage(imageID int64) (string, error) {
	img, err := database.GetImageByID(s.db, imageID)
	if err != nil {
		return "", err
	}

	ctx := context.Background()
	s.logAction(imageID, "EXPORT_START", fmt.Sprintf("Starting export for %s", img.FullName))

	exportPath, err := s.docker.ExportImage(ctx, img.FullName, img.Name, img.Tag, img.Platform)
	if err != nil {
		s.logAction(imageID, "EXPORT_FAILED", fmt.Sprintf("Export failed: %v", err))
		// Send webhook notification for export failure
		if s.webhook != nil {
			s.webhook.SendNotification("Docker Pull Manager", fmt.Sprintf("❌ Export failed: %s (%s) - %v", img.FullName, img.Platform, err))
		}
		return "", err
	}

	database.UpdateImageExport(s.db, imageID, exportPath)
	s.logAction(imageID, "EXPORT_SUCCESS", fmt.Sprintf("Exported to %s", exportPath))

	// Send webhook notification for successful export
	if s.webhook != nil {
		s.webhook.SendNotification("Docker Pull Manager", fmt.Sprintf("📦 Export succeeded: %s (%s) -> %s", img.FullName, img.Platform, exportPath))
	}

	return exportPath, nil
}

func (s *ImageService) GetImages() ([]models.Image, error) {
	return database.GetImages(s.db)
}

func (s *ImageService) GetImageLogs(imageID int64) ([]models.ImageLog, error) {
	return database.GetImageLogs(s.db, imageID)
}

func (s *ImageService) DeleteImage(imageID int64) error {
	return database.DeleteImage(s.db, imageID)
}

func (s *ImageService) UpdateImage(imageID int64, req *models.UpdateImageRequest) (*models.Image, error) {
	img, err := database.GetImageByID(s.db, imageID)
	if err != nil {
		return nil, err
	}

	if img.Status == "pulling" {
		return nil, fmt.Errorf("cannot edit image while pulling")
	}

	originalPlatform := img.Platform

	if req.Name != "" {
		img.Name = req.Name
	}
	if req.Tag != "" {
		img.Tag = req.Tag
	}
	img.FullName = img.Name + ":" + img.Tag
	if req.Platform != "" {
		img.Platform = req.Platform
	}
	img.IsAutoExport = req.IsAutoExport

	platformChanged := (img.Platform != originalPlatform)

	if platformChanged || img.Status == "success" {
		img.Status = "pending"
		img.ExportPath = nil
		img.ErrorMessage = nil
		img.RetryCount = 0
		err = database.UpdateImageAndReset(s.db, imageID, img.Name, img.Tag, img.FullName, img.Platform, img.IsAutoExport)
	} else {
		err = database.UpdateImage(s.db, imageID, img.Name, img.Tag, img.FullName, img.Platform, img.IsAutoExport)
	}

	if err != nil {
		return nil, err
	}

	s.logAction(imageID, "UPDATE", fmt.Sprintf("Updated image to %s:%s (%s)", img.Name, img.Tag, img.Platform))
	if platformChanged && originalPlatform != "" {
		s.logAction(imageID, "PLATFORM_CHANGED", fmt.Sprintf("Platform changed from %s to %s, will re-pull", originalPlatform, img.Platform))
	}
	return img, nil
}

func (s *ImageService) logAction(imageID int64, action, message string) {
	log := &models.ImageLog{
		ImageID: imageID,
		Action:  action,
		Message: message,
	}
	database.CreateLog(s.db, log)
}

type WebhookService struct {
	cfg *config.Config
}

func NewWebhookService(cfg *config.Config) *WebhookService {
	return &WebhookService{cfg: cfg}
}

func (s *WebhookService) SendNotification(title, message string) error {
	if !s.cfg.EnableWebhook || s.cfg.WebhookURL == "" {
		return nil
	}

	var payload map[string]interface{}

	switch s.cfg.WebhookType {
	case "dingtalk":
		payload = map[string]interface{}{
			"msgtype": "text",
			"text": map[string]string{
				"content": fmt.Sprintf("%s\n%s", title, message),
			},
		}
	case "feishu":
		payload = map[string]interface{}{
			"msg_type": "text",
			"content": map[string]string{
				"text": fmt.Sprintf("%s\n%s", title, message),
			},
		}
	case "wechat":
		payload = map[string]interface{}{
			"msgtype": "text",
			"text": map[string]string{
				"content": fmt.Sprintf("%s\n%s", title, message),
			},
		}
	default:
		return fmt.Errorf("unknown webhook type: %s", s.cfg.WebhookType)
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(s.cfg.WebhookURL, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

func (s *WebhookService) TestWebhook() error {
	return s.SendNotification("Docker Pull Manager", "This is a test notification from Docker Pull Manager")
}
