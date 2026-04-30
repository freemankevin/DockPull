package handler

import (
	"docker-pull-manager/internal/database"
	"docker-pull-manager/internal/docker"
	"docker-pull-manager/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"export_path":           toUnixPath(h.cfg.ExportPath),
		"retry_max_attempts":    h.cfg.RetryMaxAttempts,
		"retry_interval_sec":    h.cfg.RetryIntervalSec,
		"enable_webhook":        h.cfg.EnableWebhook,
		"webhook_url":           h.cfg.WebhookURL,
		"webhook_type":          h.cfg.WebhookType,
		"concurrent_pulls":      h.cfg.ConcurrentPulls,
		"default_platform":      h.cfg.DefaultPlatform,
		"gzip_compression":      h.cfg.GzipCompression,
		"container_runtime":     h.cfg.ContainerRuntime,
		"ghcr_token":            h.cfg.GhcrToken,
		"ghcr_username":         h.cfg.GhcrUsername,
		"ghcr_verified":         h.cfg.GhcrVerified,
		"dockerhub_username":    h.cfg.DockerHubUsername,
		"dockerhub_token":       h.cfg.DockerHubToken,
		"dockerhub_verified":    h.cfg.DockerHubVerified,
		"quay_username":         h.cfg.QuayUsername,
		"quay_password":         h.cfg.QuayPassword,
		"quay_verified":         h.cfg.QuayVerified,
		"acr_username":          h.cfg.AcrUsername,
		"acr_password":          h.cfg.AcrPassword,
		"acr_verified":          h.cfg.AcrVerified,
		"ecr_access_key_id":     h.cfg.EcrAccessKeyId,
		"ecr_secret_access_key": h.cfg.EcrSecretAccessKey,
		"ecr_region":            h.cfg.EcrRegion,
		"ecr_verified":          h.cfg.EcrVerified,
		"gar_token":             h.cfg.GarToken,
		"gar_verified":          h.cfg.GarVerified,
		"harbor_url":            h.cfg.HarborUrl,
		"harbor_username":       h.cfg.HarborUsername,
		"harbor_password":       h.cfg.HarborPassword,
		"harbor_tls_cert":       h.cfg.HarborTlsCert,
		"harbor_verified":       h.cfg.HarborVerified,
		"tencentcloud_username": h.cfg.TencentcloudUsername,
		"tencentcloud_password": h.cfg.TencentcloudPassword,
		"tencentcloud_verified": h.cfg.TencentcloudVerified,
		"huaweicloud_username":  h.cfg.HuaweicloudUsername,
		"huaweicloud_password":  h.cfg.HuaweicloudPassword,
		"huaweicloud_verified":  h.cfg.HuaweicloudVerified,
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
	if req.ContainerRuntime != "" {
		h.cfg.ContainerRuntime = req.ContainerRuntime
	}

	h.cfg.GhcrToken = req.GhcrToken
	h.cfg.GhcrUsername = req.GhcrUsername
	h.cfg.GhcrVerified = req.GhcrVerified
	h.cfg.DockerHubUsername = req.DockerHubUsername
	h.cfg.DockerHubToken = req.DockerHubToken
	h.cfg.DockerHubVerified = req.DockerHubVerified
	h.cfg.QuayUsername = req.QuayUsername
	h.cfg.QuayPassword = req.QuayPassword
	h.cfg.QuayVerified = req.QuayVerified
	h.cfg.AcrUsername = req.AcrUsername
	h.cfg.AcrPassword = req.AcrPassword
	h.cfg.AcrVerified = req.AcrVerified
	h.cfg.EcrAccessKeyId = req.EcrAccessKeyId
	h.cfg.EcrSecretAccessKey = req.EcrSecretAccessKey
	h.cfg.EcrRegion = req.EcrRegion
	h.cfg.EcrVerified = req.EcrVerified
	h.cfg.GarToken = req.GarToken
	h.cfg.GarVerified = req.GarVerified
	h.cfg.HarborUrl = req.HarborUrl
	h.cfg.HarborUsername = req.HarborUsername
	h.cfg.HarborPassword = req.HarborPassword
	h.cfg.HarborTlsCert = req.HarborTlsCert
	h.cfg.HarborVerified = req.HarborVerified
	h.cfg.TencentcloudUsername = req.TencentcloudUsername
	h.cfg.TencentcloudPassword = req.TencentcloudPassword
	h.cfg.TencentcloudVerified = req.TencentcloudVerified
	h.cfg.HuaweicloudUsername = req.HuaweicloudUsername
	h.cfg.HuaweicloudPassword = req.HuaweicloudPassword
	h.cfg.HuaweicloudVerified = req.HuaweicloudVerified

	settings := &models.Settings{
		ExportPath:           h.cfg.ExportPath,
		RetryMaxAttempts:     h.cfg.RetryMaxAttempts,
		RetryIntervalSec:     h.cfg.RetryIntervalSec,
		EnableWebhook:        h.cfg.EnableWebhook,
		WebhookURL:           h.cfg.WebhookURL,
		WebhookType:          h.cfg.WebhookType,
		ConcurrentPulls:      h.cfg.ConcurrentPulls,
		DefaultPlatform:      h.cfg.DefaultPlatform,
		GzipCompression:      h.cfg.GzipCompression,
		ContainerRuntime:     h.cfg.ContainerRuntime,
		GhcrToken:            h.cfg.GhcrToken,
		GhcrUsername:         h.cfg.GhcrUsername,
		GhcrVerified:         h.cfg.GhcrVerified,
		DockerHubUsername:    h.cfg.DockerHubUsername,
		DockerHubToken:       h.cfg.DockerHubToken,
		DockerHubVerified:    h.cfg.DockerHubVerified,
		QuayUsername:         h.cfg.QuayUsername,
		QuayPassword:         h.cfg.QuayPassword,
		QuayVerified:         h.cfg.QuayVerified,
		AcrUsername:          h.cfg.AcrUsername,
		AcrPassword:          h.cfg.AcrPassword,
		AcrVerified:          h.cfg.AcrVerified,
		EcrAccessKeyId:       h.cfg.EcrAccessKeyId,
		EcrSecretAccessKey:   h.cfg.EcrSecretAccessKey,
		EcrRegion:            h.cfg.EcrRegion,
		EcrVerified:          h.cfg.EcrVerified,
		GarToken:             h.cfg.GarToken,
		GarVerified:          h.cfg.GarVerified,
		HarborUrl:            h.cfg.HarborUrl,
		HarborUsername:       h.cfg.HarborUsername,
		HarborPassword:       h.cfg.HarborPassword,
		HarborTlsCert:        h.cfg.HarborTlsCert,
		HarborVerified:       h.cfg.HarborVerified,
		TencentcloudUsername: h.cfg.TencentcloudUsername,
		TencentcloudPassword: h.cfg.TencentcloudPassword,
		TencentcloudVerified: h.cfg.TencentcloudVerified,
		HuaweicloudUsername:  h.cfg.HuaweicloudUsername,
		HuaweicloudPassword:  h.cfg.HuaweicloudPassword,
		HuaweicloudVerified:  h.cfg.HuaweicloudVerified,
	}

	if err := database.UpdateSettings(h.db, settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"export_path":           toUnixPath(h.cfg.ExportPath),
		"retry_max_attempts":    h.cfg.RetryMaxAttempts,
		"retry_interval_sec":    h.cfg.RetryIntervalSec,
		"enable_webhook":        h.cfg.EnableWebhook,
		"webhook_url":           h.cfg.WebhookURL,
		"webhook_type":          h.cfg.WebhookType,
		"concurrent_pulls":      h.cfg.ConcurrentPulls,
		"default_platform":      h.cfg.DefaultPlatform,
		"gzip_compression":      h.cfg.GzipCompression,
		"container_runtime":     h.cfg.ContainerRuntime,
		"ghcr_token":            h.cfg.GhcrToken,
		"ghcr_username":         h.cfg.GhcrUsername,
		"ghcr_verified":         h.cfg.GhcrVerified,
		"dockerhub_username":    h.cfg.DockerHubUsername,
		"dockerhub_token":       h.cfg.DockerHubToken,
		"dockerhub_verified":    h.cfg.DockerHubVerified,
		"quay_username":         h.cfg.QuayUsername,
		"quay_password":         h.cfg.QuayPassword,
		"quay_verified":         h.cfg.QuayVerified,
		"acr_username":          h.cfg.AcrUsername,
		"acr_password":          h.cfg.AcrPassword,
		"acr_verified":          h.cfg.AcrVerified,
		"ecr_access_key_id":     h.cfg.EcrAccessKeyId,
		"ecr_secret_access_key": h.cfg.EcrSecretAccessKey,
		"ecr_region":            h.cfg.EcrRegion,
		"ecr_verified":          h.cfg.EcrVerified,
		"gar_token":             h.cfg.GarToken,
		"gar_verified":          h.cfg.GarVerified,
		"harbor_url":            h.cfg.HarborUrl,
		"harbor_username":       h.cfg.HarborUsername,
		"harbor_password":       h.cfg.HarborPassword,
		"harbor_tls_cert":       h.cfg.HarborTlsCert,
		"harbor_verified":       h.cfg.HarborVerified,
		"tencentcloud_username": h.cfg.TencentcloudUsername,
		"tencentcloud_password": h.cfg.TencentcloudPassword,
		"tencentcloud_verified": h.cfg.TencentcloudVerified,
		"huaweicloud_username":  h.cfg.HuaweicloudUsername,
		"huaweicloud_password":  h.cfg.HuaweicloudPassword,
		"huaweicloud_verified":  h.cfg.HuaweicloudVerified,
	})
}

func (h *Handler) TestWebhook(c *gin.Context) {
	if err := h.webhookService.TestWebhook(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "webhook test sent"})
}

func (h *Handler) DetectRuntime(c *gin.Context) {
	dockerAvailable, podmanAvailable := docker.DetectRuntime()
	
	currentRuntime := h.cfg.ContainerRuntime
	if currentRuntime == "" {
		currentRuntime = "docker"
	}
	
	recommended := "docker"
	if !dockerAvailable && podmanAvailable {
		recommended = "podman"
	}
	
	c.JSON(http.StatusOK, gin.H{
		"docker_available":  dockerAvailable,
		"podman_available":  podmanAvailable,
		"current_runtime":   currentRuntime,
		"recommended":       recommended,
	})
}