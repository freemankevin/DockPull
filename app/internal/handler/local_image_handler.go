package handler

import (
	"context"
	"docker-pull-manager/internal/database"
	"docker-pull-manager/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ExportLocalImageRequest struct {
	ExportPath string `json:"export_path"`
}

const LocalImageLogID = int64(-1)

func (h *Handler) logLocalAction(action, message string) {
	log := &models.ImageLog{
		ImageID: LocalImageLogID,
		Action:  action,
		Message: message,
	}
	database.CreateLog(h.db, log)
}

func (h *Handler) ListLocalImages(c *gin.Context) {
	ctx := context.Background()
	images, err := h.dockerService.ListLocalImages(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, images)
}

func (h *Handler) DeleteLocalImage(c *gin.Context) {
	imageID := c.Param("id")
	if imageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "image id is required"})
		return
	}

	ctx := context.Background()

	images, err := h.dockerService.ListLocalImages(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var repoTag, arch string
	for _, img := range images {
		if img.ID == imageID {
			repoTag = img.Repository + ":" + img.Tag
			arch = img.Architecture
			break
		}
	}

	force := c.Query("force") == "true"
	h.logLocalAction("LOCAL_DELETE_START", "Starting delete for "+repoTag+" ("+arch+")")

	err = h.dockerService.DeleteLocalImage(ctx, imageID, force)
	if err != nil {
		h.logLocalAction("LOCAL_DELETE_FAILED", "Failed to delete "+repoTag+": "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.logLocalAction("LOCAL_DELETE_SUCCESS", "Successfully deleted "+repoTag+" ("+arch+")")
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) ExportLocalImage(c *gin.Context) {
	imageID := c.Param("id")
	if imageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "image id is required"})
		return
	}

	var req ExportLocalImageRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ExportPath == "" {
		req.ExportPath = h.cfg.ExportPath
	}

	ctx := context.Background()
	images, err := h.dockerService.ListLocalImages(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var repoTag string
	var architecture string
	for _, img := range images {
		if img.ID == imageID {
			repoTag = img.Repository + ":" + img.Tag
			architecture = img.Architecture
			break
		}
	}

	if repoTag == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "image not found"})
		return
	}

	h.logLocalAction("LOCAL_EXPORT_START", "Starting export for "+repoTag+" ("+architecture+")")

	exportPath, err := h.dockerService.ExportLocalImage(ctx, repoTag, architecture, req.ExportPath)
	if err != nil {
		h.logLocalAction("LOCAL_EXPORT_FAILED", "Failed to export "+repoTag+": "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.logLocalAction("LOCAL_EXPORT_SUCCESS", "Exported "+repoTag+" ("+architecture+") to "+exportPath)
	c.JSON(http.StatusOK, gin.H{"path": exportPath})
}
