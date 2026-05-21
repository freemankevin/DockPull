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

type BuildImageRequest struct {
	DockerfilePath string            `json:"dockerfile_path" binding:"required"`
	Tag            string            `json:"tag" binding:"required"`
	BuildArgs      map[string]string `json:"build_args"`
}

const BuildLogID = int64(-2)

func (h *Handler) logBuildAction(action, message string) {
	log := &models.ImageLog{
		ImageID: BuildLogID,
		Action:  action,
		Message: message,
	}
	database.CreateLog(h.db, log)
}

func (h *Handler) ListBuilds(c *gin.Context) {
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
	c.JSON(http.StatusOK, images)
}

func (h *Handler) BuildImage(c *gin.Context) {
	var req BuildImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Second)
	defer cancel()

	h.logBuildAction("BUILD_START", fmt.Sprintf("Building %s from %s", req.Tag, req.DockerfilePath))

	err := h.dockerService.BuildImage(ctx, req.DockerfilePath, req.Tag, req.BuildArgs)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			h.logBuildAction("BUILD_FAILED", fmt.Sprintf("Timeout building %s", req.Tag))
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: build operation took too long"})
			return
		}
		h.logBuildAction("BUILD_FAILED", fmt.Sprintf("Failed to build %s: %s", req.Tag, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.logBuildAction("BUILD_SUCCESS", fmt.Sprintf("Successfully built %s", req.Tag))
	c.JSON(http.StatusOK, gin.H{"message": "built", "tag": req.Tag})
}

func (h *Handler) DeleteBuild(c *gin.Context) {
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

	var repoTag string
	for _, img := range images {
		if img.ID == imageID {
			repoTag = img.Repository + ":" + img.Tag
			break
		}
	}

	force := c.Query("force") == "true"

	deleteCtx, deleteCancel := context.WithTimeout(context.Background(), 180*time.Second)
	defer deleteCancel()

	err = h.dockerService.DeleteLocalImage(deleteCtx, imageID, force)
	if err != nil {
		if deleteCtx.Err() == context.DeadlineExceeded {
			h.logBuildAction("BUILD_DELETE_FAILED", "Timeout while deleting "+repoTag)
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: delete operation took too long"})
			return
		}
		h.logBuildAction("BUILD_DELETE_FAILED", "Failed to delete "+repoTag+": "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.logBuildAction("BUILD_DELETE_SUCCESS", "Successfully deleted "+repoTag)
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
