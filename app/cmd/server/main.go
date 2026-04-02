package main

import (
	"docker-pull-manager/internal/config"
	"docker-pull-manager/internal/database"
	"docker-pull-manager/internal/docker"
	"docker-pull-manager/internal/handler"
	"docker-pull-manager/internal/middleware"
	"docker-pull-manager/internal/service"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
)

func main() {
	gin.SetMode(gin.ReleaseMode)

	cfg := config.Load()

	db, err := database.Init(cfg.DatabasePath)
	if err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to init database: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
		return
	}

	dockerService := docker.NewDockerService(cfg)
	imageService := service.NewImageService(db, dockerService, cfg)
	webhookService := service.NewWebhookService(cfg)

	c := cron.New()
	c.AddFunc("@every 1m", func() {
		imageService.ProcessPendingImages()
	})
	c.Start()

	r := gin.New()
	r.Use(middleware.Logger())

	h := handler.NewHandler(imageService, dockerService, webhookService, cfg)

	r.GET("/api/images", h.ListImages)
	r.POST("/api/images", h.CreateImage)
	r.DELETE("/api/images/:id", h.DeleteImage)
	r.GET("/api/images/:id/logs", h.GetImageLogs)
	r.POST("/api/images/:id/pull", h.PullImage)
	r.POST("/api/images/:id/export", h.ExportImage)
	r.GET("/api/config", h.GetConfig)
	r.PUT("/api/config", h.UpdateConfig)
	r.POST("/api/webhook/test", h.TestWebhook)
	r.GET("/api/stats", h.GetStats)

	fmt.Printf("\033[32m%s [INFO] Server starting on 127.0.0.1:9238\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"))
	r.Run("127.0.0.1:9238")
}
