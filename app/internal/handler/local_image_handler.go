package handler

import (
	"context"
	"cove/internal/database"
	"cove/internal/models"
	"fmt"
	"net/http"
	"time"

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

func (h *Handler) GetOperationStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"busy":       h.imageService.IsBusy(),
		"operations": h.imageService.GetActiveOperations(),
	})
}

func (h *Handler) ListLocalImages(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	images, err := h.dockerService.ListLocalImages(ctx)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: listing images took too long, container runtime may be busy"})
			return
		}
		h.logLocalAction("LOCAL_LIST_FAILED", fmt.Sprintf("Failed to list local images: %s", err.Error()))
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

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	images, err := h.dockerService.ListLocalImages(ctx)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: listing images took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var repoTag, arch string
	for _, img := range images {
		if img.ID == imageID {
			repoTag = img.Repository + ":" + img.Tag
			arch = img.Platform
			break
		}
	}

	force := c.Query("force") == "true"
	h.logLocalAction("LOCAL_DELETE_START", "Starting delete for "+repoTag+" ("+arch+")")

	deleteCtx, deleteCancel := context.WithTimeout(context.Background(), 180*time.Second)
	defer deleteCancel()

	err = h.dockerService.DeleteLocalImage(deleteCtx, imageID, force)
	if err != nil {
		if deleteCtx.Err() == context.DeadlineExceeded {
			h.logLocalAction("LOCAL_DELETE_FAILED", "Timeout while deleting "+repoTag)
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: delete operation took too long"})
			return
		}
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

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	images, err := h.dockerService.ListLocalImages(ctx)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: listing images took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var repoTag string
	var architecture string
	for _, img := range images {
		if img.ID == imageID {
			repoTag = img.Repository + ":" + img.Tag
			architecture = img.Platform
			break
		}
	}

	if repoTag == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "image not found"})
		return
	}

	h.logLocalAction("LOCAL_EXPORT_START", "Starting export for "+repoTag+" ("+architecture+")")

	exportCtx, exportCancel := context.WithTimeout(context.Background(), 300*time.Second)
	defer exportCancel()

	exportPath, err := h.dockerService.ExportLocalImage(exportCtx, repoTag, architecture, req.ExportPath)
	if err != nil {
		if exportCtx.Err() == context.DeadlineExceeded {
			h.logLocalAction("LOCAL_EXPORT_FAILED", "Timeout while exporting "+repoTag)
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: export operation took too long"})
			return
		}
		h.logLocalAction("LOCAL_EXPORT_FAILED", "Failed to export "+repoTag+": "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.logLocalAction("LOCAL_EXPORT_SUCCESS", "Exported "+repoTag+" ("+architecture+") to "+exportPath)
	c.JSON(http.StatusOK, gin.H{"path": exportPath})
}