package database

import (
	"database/sql"
	"docker-pull-manager/internal/config"
	"docker-pull-manager/internal/models"
)

func GetSettings(db *sql.DB) (*models.Settings, error) {
	query := `SELECT export_path, retry_max_attempts, retry_interval_sec, enable_webhook,
			  webhook_url, webhook_type, concurrent_pulls, default_platform, gzip_compression, ghcr_token,
			  dockerhub_username, dockerhub_token, quay_token, acr_username, acr_password,
			  ecr_access_key_id, ecr_secret_access_key, ecr_region, gar_token
			  FROM settings WHERE id = 1`

	var s models.Settings
	err := db.QueryRow(query).Scan(
		&s.ExportPath, &s.RetryMaxAttempts, &s.RetryIntervalSec, &s.EnableWebhook,
		&s.WebhookURL, &s.WebhookType, &s.ConcurrentPulls, &s.DefaultPlatform,
		&s.GzipCompression, &s.GhcrToken,
		&s.DockerHubUsername, &s.DockerHubToken, &s.QuayToken,
		&s.AcrUsername, &s.AcrPassword,
		&s.EcrAccessKeyId, &s.EcrSecretAccessKey, &s.EcrRegion, &s.GarToken,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return &models.Settings{
				ExportPath:         config.GetDefaultExportPath(),
				RetryMaxAttempts:   0,
				RetryIntervalSec:   30,
				EnableWebhook:      false,
				WebhookURL:         "",
				WebhookType:        "dingtalk",
				ConcurrentPulls:    3,
				DefaultPlatform:    "linux/amd64,linux/arm64",
				GzipCompression:    9,
				GhcrToken:          "",
				DockerHubUsername:  "",
				DockerHubToken:     "",
				QuayToken:          "",
				AcrUsername:        "",
				AcrPassword:        "",
				EcrAccessKeyId:     "",
				EcrSecretAccessKey: "",
				EcrRegion:          "",
				GarToken:           "",
			}, nil
		}
		return nil, err
	}

	return &s, nil
}

func UpdateSettings(db *sql.DB, s *models.Settings) error {
	query := `UPDATE settings SET
			  export_path = ?,
			  retry_max_attempts = ?,
			  retry_interval_sec = ?,
			  enable_webhook = ?,
			  webhook_url = ?,
			  webhook_type = ?,
			  concurrent_pulls = ?,
			  default_platform = ?,
			  gzip_compression = ?,
			  ghcr_token = ?,
			  dockerhub_username = ?,
			  dockerhub_token = ?,
			  quay_token = ?,
			  acr_username = ?,
			  acr_password = ?,
			  ecr_access_key_id = ?,
			  ecr_secret_access_key = ?,
			  ecr_region = ?,
			  gar_token = ?,
			  updated_at = CURRENT_TIMESTAMP
			  WHERE id = 1`

	_, err := db.Exec(query,
		s.ExportPath, s.RetryMaxAttempts, s.RetryIntervalSec, s.EnableWebhook,
		s.WebhookURL, s.WebhookType, s.ConcurrentPulls, s.DefaultPlatform,
		s.GzipCompression, s.GhcrToken,
		s.DockerHubUsername, s.DockerHubToken, s.QuayToken,
		s.AcrUsername, s.AcrPassword,
		s.EcrAccessKeyId, s.EcrSecretAccessKey, s.EcrRegion, s.GarToken,
	)
	return err
}
