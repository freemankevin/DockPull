package handler

import (
	"docker-pull-manager/internal/models"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListImages(c *gin.Context) {
	images, err := h.imageService.GetImages()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, images)
}

func (h *Handler) CreateImage(c *gin.Context) {
	var req models.CreateImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	image, err := h.imageService.CreateImage(&req)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "duplicate": true})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, image)
}

func (h *Handler) DeleteImage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.imageService.DeleteImage(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) UpdateImage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	image, err := h.imageService.UpdateImage(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, image)
}

func (h *Handler) GetImageLogs(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	logs, err := h.imageService.GetImageLogs(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func (h *Handler) PullImage(c *gin.Context) {
	_, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	go h.imageService.ProcessPendingImages()

	c.JSON(http.StatusOK, gin.H{"message": "pull started"})
}

func (h *Handler) ExportImage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	path, err := h.imageService.ExportImage(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"path": path})
}

func (h *Handler) GetStats(c *gin.Context) {
	images, err := h.imageService.GetImages()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var total, success, failed, pending int
	for _, img := range images {
		total++
		switch img.Status {
		case "success":
			success++
		case "failed":
			failed++
		case "pending", "pulling":
			pending++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total":   total,
		"success": success,
		"failed":  failed,
		"pending": pending,
	})
}

func (h *Handler) CheckPlatforms(c *gin.Context) {
	name := c.Query("name")
	tag := c.Query("tag")

	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	if tag == "" {
		tag = "latest"
	}

	platforms, err := h.dockerService.GetImagePlatforms(name, tag)
	if err != nil {
		platforms, err = h.dockerService.GetImagePlatformsFromRegistry(name, tag)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"platforms": []string{"linux/amd64", "linux/arm64"}})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"platforms": platforms})
}
