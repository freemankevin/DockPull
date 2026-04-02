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
)

type ImageService struct {
	db     *sql.DB
	docker *docker.DockerService
	cfg    *config.Config
}

func NewImageService(db *sql.DB, dockerSvc *docker.DockerService, cfg *config.Config) *ImageService {
	return &ImageService{
		db:     db,
		docker: dockerSvc,
		cfg:    cfg,
	}
}

func (s *ImageService) CreateImage(req *models.CreateImageRequest) (*models.Image, error) {
	image := &models.Image{
		Name:         req.Name,
		Tag:          req.Tag,
		Platform:     req.Platform,
		Status:       "pending",
		IsAutoExport: req.IsAutoExport,
	}

	if image.Tag == "" {
		image.Tag = "latest"
	}
	if image.Platform == "" {
		image.Platform = s.cfg.DefaultPlatform
	}

	err := database.CreateImage(s.db, image)
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
		return
	}

	database.UpdateImageStatus(s.db, img.ID, "success", "")
	s.logAction(img.ID, "PULL_SUCCESS", fmt.Sprintf("Successfully pulled %s", img.FullName))

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

	exportPath, err := s.docker.ExportImage(ctx, img.FullName)
	if err != nil {
		s.logAction(imageID, "EXPORT_FAILED", fmt.Sprintf("Export failed: %v", err))
		return "", err
	}

	database.UpdateImageExport(s.db, imageID, exportPath)
	s.logAction(imageID, "EXPORT_SUCCESS", fmt.Sprintf("Exported to %s", exportPath))

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
