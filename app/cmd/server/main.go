package main

import (
	"docker-pull-manager/internal/config"
	"docker-pull-manager/internal/database"
	"docker-pull-manager/internal/docker"
	"docker-pull-manager/internal/handler"
	"docker-pull-manager/internal/middleware"
	"docker-pull-manager/internal/service"
	"fmt"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
)

func main() {
	gin.SetMode(gin.ReleaseMode)

	// Ensure data directory exists (at root level)
	dataDir := config.GetDataDir()
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to create data directory: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
		return
	}

	// Initialize database
	db, err := database.Init(config.DatabaseFilePath())
	if err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to init database: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
		return
	}

	// Load settings from database
	settings, err := database.GetSettings(db)
	if err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to load settings: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
		return
	}

	// Ensure exports directory exists (use root exports dir)
	exportsDir := config.GetExportsDir()
	if settings.ExportPath == "" {
		// First run: update database with correct exports path
		settings.ExportPath = exportsDir
		db.Exec(`UPDATE settings SET export_path = ? WHERE id = 1`, exportsDir)
	} else if settings.ExportPath == "./exports" || settings.ExportPath == ".\\exports" {
		// Migrate old relative path to absolute root path
		settings.ExportPath = exportsDir
		db.Exec(`UPDATE settings SET export_path = ? WHERE id = 1`, exportsDir)
	}
	if err := os.MkdirAll(exportsDir, 0755); err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to create exports directory: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
		return
	}

	// Create config from settings
	cfg := config.FromSettings(settings)

	authHandler := handler.NewAuthHandler(db)
	if err := authHandler.InitDefaultUser(); err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to init default user: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
	}

	dockerService := docker.NewDockerService(cfg)
	webhookService := service.NewWebhookService(cfg)
	imageService := service.NewImageService(db, dockerService, cfg, webhookService)

	c := cron.New()
	c.AddFunc("@every 1m", func() {
		imageService.ProcessPendingImages()
	})
	c.Start()

	r := gin.New()
	r.Use(middleware.Logger())

	// Debug endpoint to check user
	r.GET("/debug/user/:username", func(c *gin.Context) {
		username := c.Param("username")
		var id int64
		var dbUsername, password string
		err := db.QueryRow("SELECT id, username, password FROM users WHERE username = ?", username).Scan(&id, &dbUsername, &password)
		if err != nil {
			c.JSON(404, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"id": id, "username": dbUsername, "password_hash": password})
	})

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.POST("/api/auth/login", authHandler.Login)
	r.GET("/api/auth/me", middleware.AuthMiddleware(), authHandler.Me)

	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		h := handler.NewHandler(imageService, dockerService, webhookService, cfg, db)
		api.GET("/images", h.ListImages)
		api.POST("/images", h.CreateImage)
		api.PUT("/images/:id", h.UpdateImage)
		api.DELETE("/images/:id", h.DeleteImage)
		api.GET("/images/:id/logs", h.GetImageLogs)
		api.POST("/images/:id/pull", h.PullImage)
		api.POST("/images/:id/export", h.ExportImage)
		api.GET("/images/check-platforms", h.CheckPlatforms)
		api.GET("/config", h.GetConfig)
		api.PUT("/config", h.UpdateConfig)
		api.GET("/browse", h.BrowseDirectory)
		api.POST("/webhook/test", h.TestWebhook)
		api.GET("/stats", h.GetStats)
	}

	fmt.Printf("\033[32m%s [INFO] Server starting on 127.0.0.1:9238\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"))
	fmt.Printf("\033[36m%s [INFO] Default credentials: admin / 123456\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"))
	r.Run("127.0.0.1:9238")
}
