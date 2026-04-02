package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	DatabasePath     string `json:"database_path"`
	ExportPath       string `json:"export_path"`
	RetryMaxAttempts int    `json:"retry_max_attempts"`
	RetryIntervalSec int    `json:"retry_interval_sec"`
	EnableWebhook    bool   `json:"enable_webhook"`
	WebhookURL       string `json:"webhook_url"`
	WebhookType      string `json:"webhook_type"` // dingtalk, feishu, wechat
	ConcurrentPulls  int    `json:"concurrent_pulls"`
	DefaultPlatform  string `json:"default_platform"`
	GzipCompression  int    `json:"gzip_compression"` // 1-9
}

func Load() *Config {
	cfg := &Config{
		DatabasePath:     "./data/app.db",
		ExportPath:       "./exports",
		RetryMaxAttempts: 0, // 0 means unlimited
		RetryIntervalSec: 30,
		EnableWebhook:    false,
		WebhookType:      "dingtalk",
		ConcurrentPulls:  3,
		DefaultPlatform:  "linux/amd64",
		GzipCompression:  9,
	}

	configDir := "./config"
	configFile := filepath.Join(configDir, "config.json")

	if data, err := os.ReadFile(configFile); err == nil {
		json.Unmarshal(data, cfg)
	}

	os.MkdirAll(filepath.Dir(cfg.DatabasePath), 0755)
	os.MkdirAll(cfg.ExportPath, 0755)

	return cfg
}

func (c *Config) Save() error {
	configDir := "./config"
	configFile := filepath.Join(configDir, "config.json")

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configFile, data, 0644)
}
