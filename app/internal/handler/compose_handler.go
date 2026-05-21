package handler

import (
	"context"
	"cove/internal/database"
	"cove/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const ComposeLogID = int64(-3)

func (h *Handler) logComposeAction(action, message string) {
	log := &models.ImageLog{
		ImageID: ComposeLogID,
		Action:  action,
		Message: message,
	}
	database.CreateLog(h.db, log)
}

func (h *Handler) ListComposeProjects(c *gin.Context) {
	scanPath := c.Query("path")
	if scanPath == "" {
		scanPath = "."
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	projects, err := h.dockerService.ListComposeProjects(ctx, scanPath)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: scanning for compose projects took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, projects)
}

func (h *Handler) ComposeUp(c *gin.Context) {
	projectPath := c.Query("path")
	if projectPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project path is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	h.logComposeAction("COMPOSE_UP_START", "Starting compose project at "+projectPath)

	err := h.dockerService.ComposeUp(ctx, projectPath)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			h.logComposeAction("COMPOSE_UP_FAILED", "Timeout starting "+projectPath)
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: compose up took too long"})
			return
		}
		h.logComposeAction("COMPOSE_UP_FAILED", "Failed to start "+projectPath+": "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.logComposeAction("COMPOSE_UP_SUCCESS", "Successfully started "+projectPath)
	c.JSON(http.StatusOK, gin.H{"message": "started"})
}

func (h *Handler) ComposeDown(c *gin.Context) {
	projectPath := c.Query("path")
	if projectPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project path is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	h.logComposeAction("COMPOSE_DOWN_START", "Stopping compose project at "+projectPath)

	err := h.dockerService.ComposeDown(ctx, projectPath)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			h.logComposeAction("COMPOSE_DOWN_FAILED", "Timeout stopping "+projectPath)
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: compose down took too long"})
			return
		}
		h.logComposeAction("COMPOSE_DOWN_FAILED", "Failed to stop "+projectPath+": "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.logComposeAction("COMPOSE_DOWN_SUCCESS", "Successfully stopped "+projectPath)
	c.JSON(http.StatusOK, gin.H{"message": "stopped"})
}

func (h *Handler) ComposeStatus(c *gin.Context) {
	projectPath := c.Query("path")
	if projectPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project path is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	services, err := h.dockerService.ComposeStatus(ctx, projectPath)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: compose status took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, services)
}
