package handler

import (
	"docker-pull-manager/internal/database"
	"docker-pull-manager/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"export_path":        toUnixPath(h.cfg.ExportPath),
		"retry_max_attempts": h.cfg.RetryMaxAttempts,
		"retry_interval_sec": h.cfg.RetryIntervalSec,
		"enable_webhook":     h.cfg.EnableWebhook,
		"webhook_url":        h.cfg.WebhookURL,
		"webhook_type":       h.cfg.WebhookType,
		"concurrent_pulls":   h.cfg.ConcurrentPulls,
		"default_platform":   h.cfg.DefaultPlatform,
		"gzip_compression":   h.cfg.GzipCompression,
		"ghcr_token":         h.cfg.GhcrToken,
	})
}

func (h *Handler) UpdateConfig(c *gin.Context) {
	var req models.UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ExportPath != "" {
		h.cfg.ExportPath = fromUnixPath(req.ExportPath)
	}
	if req.RetryMaxAttempts >= 0 {
		h.cfg.RetryMaxAttempts = req.RetryMaxAttempts
	}
	if req.RetryIntervalSec > 0 {
		h.cfg.RetryIntervalSec = req.RetryIntervalSec
	}
	h.cfg.EnableWebhook = req.EnableWebhook
	if req.WebhookURL != "" {
		h.cfg.WebhookURL = req.WebhookURL
	}
	if req.WebhookType != "" {
		h.cfg.WebhookType = req.WebhookType
	}
	if req.ConcurrentPulls > 0 {
		h.cfg.ConcurrentPulls = req.ConcurrentPulls
	}
	if req.DefaultPlatform != "" {
		h.cfg.DefaultPlatform = req.DefaultPlatform
	}
	if req.GzipCompression > 0 && req.GzipCompression <= 9 {
		h.cfg.GzipCompression = req.GzipCompression
	}
	h.cfg.GhcrToken = req.GhcrToken

	settings := &models.Settings{
		ExportPath:       h.cfg.ExportPath,
		RetryMaxAttempts: h.cfg.RetryMaxAttempts,
		RetryIntervalSec: h.cfg.RetryIntervalSec,
		EnableWebhook:    h.cfg.EnableWebhook,
		WebhookURL:       h.cfg.WebhookURL,
		WebhookType:      h.cfg.WebhookType,
		ConcurrentPulls:  h.cfg.ConcurrentPulls,
		DefaultPlatform:  h.cfg.DefaultPlatform,
		GzipCompression:  h.cfg.GzipCompression,
		GhcrToken:        h.cfg.GhcrToken,
	}

	if err := database.UpdateSettings(h.db, settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"export_path":        toUnixPath(h.cfg.ExportPath),
		"retry_max_attempts": h.cfg.RetryMaxAttempts,
		"retry_interval_sec": h.cfg.RetryIntervalSec,
		"enable_webhook":     h.cfg.EnableWebhook,
		"webhook_url":        h.cfg.WebhookURL,
		"webhook_type":       h.cfg.WebhookType,
		"concurrent_pulls":   h.cfg.ConcurrentPulls,
		"default_platform":   h.cfg.DefaultPlatform,
		"gzip_compression":   h.cfg.GzipCompression,
		"ghcr_token":         h.cfg.GhcrToken,
	})
}

func (h *Handler) TestWebhook(c *gin.Context) {
	if err := h.webhookService.TestWebhook(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "webhook test sent"})
}
