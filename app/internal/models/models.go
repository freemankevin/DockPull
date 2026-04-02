package models

import "time"

type Image struct {
	ID           int64      `json:"id" db:"id"`
	Name         string     `json:"name" db:"name"`
	Tag          string     `json:"tag" db:"tag"`
	FullName     string     `json:"full_name" db:"full_name"`
	Platform     string     `json:"platform" db:"platform"`
	Status       string     `json:"status" db:"status"` // pending, pulling, success, failed
	RetryCount   int        `json:"retry_count" db:"retry_count"`
	ErrorMessage string     `json:"error_message" db:"error_message"`
	ExportPath   string     `json:"export_path" db:"export_path"`
	ExportedAt   *time.Time `json:"exported_at" db:"exported_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	IsAutoExport bool       `json:"is_auto_export" db:"is_auto_export"`
}

type ImageLog struct {
	ID        int64     `json:"id" db:"id"`
	ImageID   int64     `json:"image_id" db:"image_id"`
	Action    string    `json:"action" db:"action"`
	Message   string    `json:"message" db:"message"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CreateImageRequest struct {
	Name         string `json:"name" binding:"required"`
	Tag          string `json:"tag" default:"latest"`
	Platform     string `json:"platform"`
	IsAutoExport bool   `json:"is_auto_export"`
}

type BatchCreateRequest struct {
	Images []CreateImageRequest `json:"images" binding:"required"`
}

type UpdateConfigRequest struct {
	ExportPath       string `json:"export_path"`
	RetryMaxAttempts int    `json:"retry_max_attempts"`
	RetryIntervalSec int    `json:"retry_interval_sec"`
	EnableWebhook    bool   `json:"enable_webhook"`
	WebhookURL       string `json:"webhook_url"`
	WebhookType      string `json:"webhook_type"`
	ConcurrentPulls  int    `json:"concurrent_pulls"`
	DefaultPlatform  string `json:"default_platform"`
	GzipCompression  int    `json:"gzip_compression"`
}
