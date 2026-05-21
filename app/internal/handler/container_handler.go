package handler

import (
	"context"
	"cove/internal/database"
	"cove/internal/models"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

const ContainerLogID = int64(-4)

func (h *Handler) logContainerAction(action, message string) {
	log := &models.ImageLog{
		ImageID: ContainerLogID,
		Action:  action,
		Message: message,
	}
	database.CreateLog(h.db, log)
}

func (h *Handler) ListContainers(c *gin.Context) {
	all := c.Query("all") == "true"

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	containers, err := h.dockerService.ListContainers(ctx, all)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: listing containers took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, containers)
}

func (h *Handler) StartContainer(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container id is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	h.logContainerAction("CONTAINER_START", "Starting container "+id)

	err := h.dockerService.StartContainer(ctx, id)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: start operation took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "started"})
}

func (h *Handler) StopContainer(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container id is required"})
		return
	}

	timeoutSec, _ := strconv.Atoi(c.Query("timeout"))
	if timeoutSec <= 0 {
		timeoutSec = 10
	}
	timeout := time.Duration(timeoutSec) * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	h.logContainerAction("CONTAINER_STOP", "Stopping container "+id)

	err := h.dockerService.StopContainer(ctx, id, &timeout)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: stop operation took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "stopped"})
}

func (h *Handler) RestartContainer(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container id is required"})
		return
	}

	timeoutSec, _ := strconv.Atoi(c.Query("timeout"))
	if timeoutSec <= 0 {
		timeoutSec = 10
	}
	timeout := time.Duration(timeoutSec) * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	h.logContainerAction("CONTAINER_RESTART", "Restarting container "+id)

	err := h.dockerService.RestartContainer(ctx, id, &timeout)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: restart operation took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "restarted"})
}

func (h *Handler) RemoveContainer(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container id is required"})
		return
	}

	force := c.Query("force") == "true"

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	h.logContainerAction("CONTAINER_REMOVE", "Removing container "+id)

	err := h.dockerService.RemoveContainer(ctx, id, force)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: remove operation took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "removed"})
}

func (h *Handler) GetContainerLogs(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container id is required"})
		return
	}

	tail, _ := strconv.Atoi(c.Query("tail"))
	if tail <= 0 {
		tail = 100
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	logs, err := h.dockerService.GetContainerLogs(ctx, id, tail)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusGatewayTimeout, gin.H{"error": "timeout: fetching logs took too long"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
