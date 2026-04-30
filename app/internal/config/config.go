package config

import (
	"os"
	"path/filepath"

	"docker-pull-manager/internal/models"
)

// getProjectRoot returns the working directory as project root
// In Docker containers, this is /app; in development, use current directory
func getProjectRoot() string {
	wd, err := os.Getwd()
	if err != nil {
		return "."
	}
	return wd
}

// Config holds application configuration
// Most settings are now stored in database, except DatabasePath
// which is needed to connect to the database
type Config struct {
	DatabasePath         string `json:"database_path"`
	ExportPath           string `json:"export_path"`
	RetryMaxAttempts     int    `json:"retry_max_attempts"`
	RetryIntervalSec     int    `json:"retry_interval_sec"`
	EnableWebhook        bool   `json:"enable_webhook"`
	WebhookURL           string `json:"webhook_url"`
	WebhookType          string `json:"webhook_type"`
	ConcurrentPulls      int    `json:"concurrent_pulls"`
	DefaultPlatform      string `json:"default_platform"`
	GzipCompression      int    `json:"gzip_compression"`
	GhcrToken            string `json:"ghcr_token"`
	GhcrUsername         string `json:"ghcr_username"`
	GhcrVerified         bool   `json:"ghcr_verified"`
	DockerHubUsername    string `json:"dockerhub_username"`
	DockerHubToken       string `json:"dockerhub_token"`
	DockerHubVerified    bool   `json:"dockerhub_verified"`
	QuayUsername         string `json:"quay_username"`
	QuayPassword         string `json:"quay_password"`
	QuayVerified         bool   `json:"quay_verified"`
	AcrUsername          string `json:"acr_username"`
	AcrPassword          string `json:"acr_password"`
	AcrVerified          bool   `json:"acr_verified"`
	EcrAccessKeyId       string `json:"ecr_access_key_id"`
	EcrSecretAccessKey   string `json:"ecr_secret_access_key"`
	EcrRegion            string `json:"ecr_region"`
	EcrVerified          bool   `json:"ecr_verified"`
	GarToken             string `json:"gar_token"`
	GarVerified          bool   `json:"gar_verified"`
	HarborUrl            string `json:"harbor_url"`
	HarborUsername       string `json:"harbor_username"`
	HarborPassword       string `json:"harbor_password"`
	HarborTlsCert        string `json:"harbor_tls_cert"`
	HarborVerified       bool   `json:"harbor_verified"`
	TencentcloudUsername string `json:"tencentcloud_username"`
	TencentcloudPassword string `json:"tencentcloud_password"`
	TencentcloudVerified bool   `json:"tencentcloud_verified"`
	HuaweicloudUsername  string `json:"huaweicloud_username"`
	HuaweicloudPassword  string `json:"huaweicloud_password"`
	HuaweicloudVerified  bool   `json:"huaweicloud_verified"`
	ContainerRuntime     string `json:"container_runtime"`
}

// DatabaseFilePath returns the path to the SQLite database file
// This is hardcoded and cannot be changed via settings
func DatabaseFilePath() string {
	return filepath.Join(getProjectRoot(), "data", "app.db")
}

// Load returns the database path
// Note: Other settings should be loaded from database using database.GetSettings()
func Load() *Config {
	// Database path is always fixed at root level
	return &Config{
		DatabasePath: DatabaseFilePath(),
	}
}

// FromSettings creates a Config from database settings
func FromSettings(s *models.Settings) *Config {
	return &Config{
		DatabasePath:         DatabaseFilePath(),
		ExportPath:           s.ExportPath,
		RetryMaxAttempts:     s.RetryMaxAttempts,
		RetryIntervalSec:     s.RetryIntervalSec,
		EnableWebhook:        s.EnableWebhook,
		WebhookURL:           s.WebhookURL,
		WebhookType:          s.WebhookType,
		ConcurrentPulls:      s.ConcurrentPulls,
		DefaultPlatform:      s.DefaultPlatform,
		GzipCompression:      s.GzipCompression,
		GhcrToken:            s.GhcrToken,
		GhcrUsername:         s.GhcrUsername,
		GhcrVerified:         s.GhcrVerified,
		DockerHubUsername:    s.DockerHubUsername,
		DockerHubToken:       s.DockerHubToken,
		DockerHubVerified:    s.DockerHubVerified,
		QuayUsername:         s.QuayUsername,
		QuayPassword:         s.QuayPassword,
		QuayVerified:         s.QuayVerified,
		AcrUsername:          s.AcrUsername,
		AcrPassword:          s.AcrPassword,
		AcrVerified:          s.AcrVerified,
		EcrAccessKeyId:       s.EcrAccessKeyId,
		EcrSecretAccessKey:   s.EcrSecretAccessKey,
		EcrRegion:            s.EcrRegion,
		EcrVerified:          s.EcrVerified,
		GarToken:             s.GarToken,
		GarVerified:          s.GarVerified,
		HarborUrl:            s.HarborUrl,
		HarborUsername:       s.HarborUsername,
		HarborPassword:       s.HarborPassword,
		HarborTlsCert:        s.HarborTlsCert,
		HarborVerified:       s.HarborVerified,
		TencentcloudUsername: s.TencentcloudUsername,
		TencentcloudPassword: s.TencentcloudPassword,
		TencentcloudVerified: s.TencentcloudVerified,
		HuaweicloudUsername:  s.HuaweicloudUsername,
		HuaweicloudPassword:  s.HuaweicloudPassword,
		HuaweicloudVerified:  s.HuaweicloudVerified,
		ContainerRuntime:     s.ContainerRuntime,
	}
}

// GetDataDir returns the data directory path
func GetDataDir() string {
	return filepath.Join(getProjectRoot(), "data")
}

// GetDefaultExportPath returns the default export path
// In Docker containers, use /app/exports as default
func GetDefaultExportPath() string {
	return filepath.Join(getProjectRoot(), "exports")
}

// GetExportsDir returns the exports directory path
func GetExportsDir() string {
	return filepath.Join(getProjectRoot(), "exports")
}

// EnsureDirs creates necessary directories
func EnsureDirs() error {
	// Data directory (contains database)
	if err := createDirIfNotExists(GetDataDir()); err != nil {
		return err
	}
	return nil
}

func createDirIfNotExists(path string) error {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return os.MkdirAll(path, 0755)
	}
	return nil
}
