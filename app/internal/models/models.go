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
	ErrorMessage *string    `json:"error_message" db:"error_message"`
	ExportPath   *string    `json:"export_path" db:"export_path"`
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

type User struct {
	ID        int64     `json:"id" db:"id"`
	Username  string    `json:"username" db:"username"`
	Password  string    `json:"-" db:"password"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CreateImageRequest struct {
	Name         string `json:"name" binding:"required"`
	Tag          string `json:"tag" default:"latest"`
	Platform     string `json:"platform"`
	IsAutoExport bool   `json:"is_auto_export"`
}

type UpdateImageRequest struct {
	Name         string `json:"name"`
	Tag          string `json:"tag"`
	Platform     string `json:"platform"`
	IsAutoExport bool   `json:"is_auto_export"`
}

type BatchCreateRequest struct {
	Images []CreateImageRequest `json:"images" binding:"required"`
}

type UpdateConfigRequest struct {
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
	DockerHubUsername    string `json:"dockerhub_username"`
	DockerHubToken       string `json:"dockerhub_token"`
	QuayToken            string `json:"quay_token"`
	AcrUsername          string `json:"acr_username"`
	AcrPassword          string `json:"acr_password"`
	EcrAccessKeyId       string `json:"ecr_access_key_id"`
	EcrSecretAccessKey   string `json:"ecr_secret_access_key"`
	EcrRegion            string `json:"ecr_region"`
	GarToken             string `json:"gar_token"`
	HarborUrl            string `json:"harbor_url"`
	HarborUsername       string `json:"harbor_username"`
	HarborPassword       string `json:"harbor_password"`
	HarborTlsCert        string `json:"harbor_tls_cert"`
	TencentcloudUsername string `json:"tencentcloud_username"`
	TencentcloudPassword string `json:"tencentcloud_password"`
	HuaweicloudUsername  string `json:"huaweicloud_username"`
	HuaweicloudPassword  string `json:"huaweicloud_password"`
	ContainerRuntime     string `json:"container_runtime"`
}

type Settings struct {
	ExportPath           string `json:"export_path" db:"export_path"`
	RetryMaxAttempts     int    `json:"retry_max_attempts" db:"retry_max_attempts"`
	RetryIntervalSec     int    `json:"retry_interval_sec" db:"retry_interval_sec"`
	EnableWebhook        bool   `json:"enable_webhook" db:"enable_webhook"`
	WebhookURL           string `json:"webhook_url" db:"webhook_url"`
	WebhookType          string `json:"webhook_type" db:"webhook_type"`
	ConcurrentPulls      int    `json:"concurrent_pulls" db:"concurrent_pulls"`
	DefaultPlatform      string `json:"default_platform" db:"default_platform"`
	GzipCompression      int    `json:"gzip_compression" db:"gzip_compression"`
	GhcrToken            string `json:"ghcr_token" db:"ghcr_token"`
	DockerHubUsername    string `json:"dockerhub_username" db:"dockerhub_username"`
	DockerHubToken       string `json:"dockerhub_token" db:"dockerhub_token"`
	QuayToken            string `json:"quay_token" db:"quay_token"`
	AcrUsername          string `json:"acr_username" db:"acr_username"`
	AcrPassword          string `json:"acr_password" db:"acr_password"`
	EcrAccessKeyId       string `json:"ecr_access_key_id" db:"ecr_access_key_id"`
	EcrSecretAccessKey   string `json:"ecr_secret_access_key" db:"ecr_secret_access_key"`
	EcrRegion            string `json:"ecr_region" db:"ecr_region"`
	GarToken             string `json:"gar_token" db:"gar_token"`
	HarborUrl            string `json:"harbor_url" db:"harbor_url"`
	HarborUsername       string `json:"harbor_username" db:"harbor_username"`
	HarborPassword       string `json:"harbor_password" db:"harbor_password"`
	HarborTlsCert        string `json:"harbor_tls_cert" db:"harbor_tls_cert"`
	TencentcloudUsername string `json:"tencentcloud_username" db:"tencentcloud_username"`
	TencentcloudPassword string `json:"tencentcloud_password" db:"tencentcloud_password"`
	HuaweicloudUsername  string `json:"huaweicloud_username" db:"huaweicloud_username"`
	HuaweicloudPassword  string `json:"huaweicloud_password" db:"huaweicloud_password"`
	ContainerRuntime     string `json:"container_runtime" db:"container_runtime"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}
