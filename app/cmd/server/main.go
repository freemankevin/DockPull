package main

import (
	"docker-pull-manager/internal/config"
	"docker-pull-manager/internal/database"
	"docker-pull-manager/internal/docker"
	"docker-pull-manager/internal/handler"
	"docker-pull-manager/internal/middleware"
	"docker-pull-manager/internal/service"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
)

func logStep(step string, start time.Time) time.Time {
	elapsed := time.Since(start).Milliseconds()
	fmt.Printf("\033[36m%s [INFO] ✓ %s 完成 (%dms)\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"), step, elapsed)
	return time.Now()
}

func main() {
	startTime := time.Now()
	stepStart := startTime

	fmt.Printf("\033[36m%s [INFO] 🚀 服务启动中...\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"))
	fmt.Println()

	resetPassword := flag.String("reset-password", "", "Reset password for specified user to default (123456)")
	flag.Parse()

	if *resetPassword != "" {
		gin.SetMode(gin.ReleaseMode)
		db, err := database.Init(config.DatabaseFilePath())
		if err != nil {
			fmt.Printf("\033[31m%s [ERROR] Failed to init database: %v\033[0m\n",
				time.Now().Format("2006-01-02 15:04:05"), err)
			os.Exit(1)
		}

		authHandler := handler.NewAuthHandler(db)
		if err := authHandler.ResetPasswordToDefault(*resetPassword); err != nil {
			fmt.Printf("\033[31m%s [ERROR] Failed to reset password: %v\033[0m\n",
				time.Now().Format("2006-01-02 15:04:05"), err)
			os.Exit(1)
		}

		fmt.Printf("\033[32m%s [INFO] Password for user '%s' has been reset to: 123456\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), *resetPassword)
		os.Exit(0)
	}

	gin.SetMode(gin.ReleaseMode)

	// Step 1: Ensure data directory exists
	dataDir := config.GetDataDir()
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to create data directory: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
		return
	}
	stepStart = logStep("创建数据目录", stepStart)

	// Step 2: Initialize database
	db, err := database.Init(config.DatabaseFilePath())
	if err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to init database: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
		return
	}
	stepStart = logStep("初始化数据库", stepStart)

	// Step 3: Load settings from database
	settings, err := database.GetSettings(db)
	if err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to load settings: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
		return
	}
	stepStart = logStep("加载配置", stepStart)

	// Step 4: Ensure exports directory exists
	exportsDir := config.GetExportsDir()
	if settings.ExportPath == "" {
		settings.ExportPath = exportsDir
		db.Exec(`UPDATE settings SET export_path = ? WHERE id = 1`, exportsDir)
	} else if settings.ExportPath == "./exports" || settings.ExportPath == ".\\exports" {
		settings.ExportPath = exportsDir
		db.Exec(`UPDATE settings SET export_path = ? WHERE id = 1`, exportsDir)
	}
	if err := os.MkdirAll(exportsDir, 0755); err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to create exports directory: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
		return
	}
	stepStart = logStep("创建导出目录", stepStart)

	// Step 5: Create config from settings
	cfg := config.FromSettings(settings)

	// Step 6: Initialize default user
	authHandler := handler.NewAuthHandler(db)
	if err := authHandler.InitDefaultUser(); err != nil {
		fmt.Printf("\033[31m%s [ERROR] Failed to init default user: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), err)
	}
	stepStart = logStep("初始化用户", stepStart)

	// Step 7: Initialize services
	dockerService := docker.NewDockerService(cfg)
	webhookService := service.NewWebhookService(cfg)
	imageService := service.NewImageService(db, dockerService, cfg, webhookService)
	stepStart = logStep("初始化服务", stepStart)

	// Step 8: Start cron job
	c := cron.New()
	c.AddFunc("@every 1m", func() {
		imageService.ProcessPendingImages()
	})
	c.Start()
	stepStart = logStep("启动定时任务", stepStart)

	// Step 9: Setup routes
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
	r.POST("/api/auth/change-password", middleware.AuthMiddleware(), authHandler.ChangePassword)

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
	stepStart = logStep("配置路由", stepStart)

	// Step 10: Serve static files (for single container deployment)
	distDir := "./dist"
	if _, err := os.Stat(distDir); err == nil {
		r.Static("/assets", distDir+"/assets")
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path
			filePath := distDir + path
			if _, err := os.Stat(filePath); err == nil {
				c.File(filePath)
				return
			}
			c.File(distDir + "/index.html")
		})
		stepStart = logStep("配置静态文件服务", stepStart)
	}

	totalTime := time.Since(startTime).Milliseconds()
	fmt.Println()
	fmt.Printf("\033[32m%s [INFO] ✅ 服务启动完成! 总耗时: %dms\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"), totalTime)
	fmt.Printf("\033[32m%s [INFO] 🌐 服务地址: http://127.0.0.1:9238\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"))
	fmt.Printf("\033[36m%s [INFO] 👤 默认账号: admin / 123456\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"))
	fmt.Println()

	host := os.Getenv("SERVER_HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("SERVER_PORT")
	}
	if port == "" {
		port = "9238"
	}
	r.Run(host + ":" + port)
}
