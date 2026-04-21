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
	DatabasePath       string `json:"database_path"`
	ExportPath         string `json:"export_path"`
	RetryMaxAttempts   int    `json:"retry_max_attempts"`
	RetryIntervalSec   int    `json:"retry_interval_sec"`
	EnableWebhook      bool   `json:"enable_webhook"`
	WebhookURL         string `json:"webhook_url"`
	WebhookType        string `json:"webhook_type"`
	ConcurrentPulls    int    `json:"concurrent_pulls"`
	DefaultPlatform    string `json:"default_platform"`
	GzipCompression    int    `json:"gzip_compression"`
	GhcrToken          string `json:"ghcr_token"`
	DockerHubUsername  string `json:"dockerhub_username"`
	DockerHubToken     string `json:"dockerhub_token"`
	QuayToken          string `json:"quay_token"`
	AcrUsername        string `json:"acr_username"`
	AcrPassword        string `json:"acr_password"`
	EcrAccessKeyId     string `json:"ecr_access_key_id"`
	EcrSecretAccessKey string `json:"ecr_secret_access_key"`
	EcrRegion          string `json:"ecr_region"`
	GarToken           string `json:"gar_token"`
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
		DatabasePath:       DatabaseFilePath(),
		ExportPath:         s.ExportPath,
		RetryMaxAttempts:   s.RetryMaxAttempts,
		RetryIntervalSec:   s.RetryIntervalSec,
		EnableWebhook:      s.EnableWebhook,
		WebhookURL:         s.WebhookURL,
		WebhookType:        s.WebhookType,
		ConcurrentPulls:    s.ConcurrentPulls,
		DefaultPlatform:    s.DefaultPlatform,
		GzipCompression:    s.GzipCompression,
		GhcrToken:          s.GhcrToken,
		DockerHubUsername:  s.DockerHubUsername,
		DockerHubToken:     s.DockerHubToken,
		QuayToken:          s.QuayToken,
		AcrUsername:        s.AcrUsername,
		AcrPassword:        s.AcrPassword,
		EcrAccessKeyId:     s.EcrAccessKeyId,
		EcrSecretAccessKey: s.EcrSecretAccessKey,
		EcrRegion:          s.EcrRegion,
		GarToken:           s.GarToken,
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
