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
			  ecr_access_key_id, ecr_secret_access_key, ecr_region, gar_token,
			  harbor_url, harbor_username, harbor_password, harbor_tls_cert,
			  tencentcloud_username, tencentcloud_password,
			  huaweicloud_username, huaweicloud_password, container_runtime
			  FROM settings WHERE id = 1`

	var exportPath, webhookURL, webhookType, defaultPlatform, ghcrToken sql.NullString
	var dockerHubUsername, dockerHubToken, quayToken, acrUsername, acrPassword sql.NullString
	var ecrAccessKeyId, ecrSecretAccessKey, ecrRegion, garToken sql.NullString
	var harborUrl, harborUsername, harborPassword, harborTlsCert sql.NullString
	var tencentcloudUsername, tencentcloudPassword sql.NullString
	var huaweicloudUsername, huaweicloudPassword, containerRuntime sql.NullString
	var retryMaxAttempts, retryIntervalSec, concurrentPulls, gzipCompression sql.NullInt64
	var enableWebhook sql.NullBool

	err := db.QueryRow(query).Scan(
		&exportPath, &retryMaxAttempts, &retryIntervalSec, &enableWebhook,
		&webhookURL, &webhookType, &concurrentPulls, &defaultPlatform,
		&gzipCompression, &ghcrToken,
		&dockerHubUsername, &dockerHubToken, &quayToken,
		&acrUsername, &acrPassword,
		&ecrAccessKeyId, &ecrSecretAccessKey, &ecrRegion, &garToken,
		&harborUrl, &harborUsername, &harborPassword, &harborTlsCert,
		&tencentcloudUsername, &tencentcloudPassword,
		&huaweicloudUsername, &huaweicloudPassword, &containerRuntime,
	)
	if err != nil {
		if err == sql.ErrNoRows {
return &models.Settings{
			ExportPath:           config.GetDefaultExportPath(),
			RetryMaxAttempts:     0,
			RetryIntervalSec:     30,
			EnableWebhook:        false,
			WebhookURL:           "",
			WebhookType:          "dingtalk",
			ConcurrentPulls:      3,
			DefaultPlatform:      "linux/amd64,linux/arm64",
			GzipCompression:      9,
			GhcrToken:            "",
			DockerHubUsername:    "",
			DockerHubToken:       "",
			QuayToken:            "",
			AcrUsername:          "",
			AcrPassword:          "",
			EcrAccessKeyId:       "",
			EcrSecretAccessKey:   "",
			EcrRegion:            "",
			GarToken:             "",
			HarborUrl:            "",
			HarborUsername:       "",
			HarborPassword:       "",
			HarborTlsCert:        "",
			TencentcloudUsername: "",
			TencentcloudPassword: "",
			HuaweicloudUsername:  "",
			HuaweicloudPassword:  "",
			ContainerRuntime:     "docker",
		}, nil
		}
		return nil, err
	}

	return &models.Settings{
		ExportPath:           nullStringToVal(exportPath, config.GetDefaultExportPath()),
		RetryMaxAttempts:     nullIntToVal(retryMaxAttempts, 0),
		RetryIntervalSec:     nullIntToVal(retryIntervalSec, 30),
		EnableWebhook:        nullBoolToVal(enableWebhook, false),
		WebhookURL:           nullStringToVal(webhookURL, ""),
		WebhookType:          nullStringToVal(webhookType, "dingtalk"),
		ConcurrentPulls:      nullIntToVal(concurrentPulls, 3),
		DefaultPlatform:      nullStringToVal(defaultPlatform, "linux/amd64,linux/arm64"),
		GzipCompression:      nullIntToVal(gzipCompression, 9),
		GhcrToken:            nullStringToVal(ghcrToken, ""),
		DockerHubUsername:    nullStringToVal(dockerHubUsername, ""),
		DockerHubToken:       nullStringToVal(dockerHubToken, ""),
		QuayToken:            nullStringToVal(quayToken, ""),
		AcrUsername:          nullStringToVal(acrUsername, ""),
		AcrPassword:          nullStringToVal(acrPassword, ""),
		EcrAccessKeyId:       nullStringToVal(ecrAccessKeyId, ""),
		EcrSecretAccessKey:   nullStringToVal(ecrSecretAccessKey, ""),
		EcrRegion:            nullStringToVal(ecrRegion, ""),
		GarToken:             nullStringToVal(garToken, ""),
		HarborUrl:            nullStringToVal(harborUrl, ""),
		HarborUsername:       nullStringToVal(harborUsername, ""),
		HarborPassword:       nullStringToVal(harborPassword, ""),
		HarborTlsCert:        nullStringToVal(harborTlsCert, ""),
		TencentcloudUsername: nullStringToVal(tencentcloudUsername, ""),
		TencentcloudPassword: nullStringToVal(tencentcloudPassword, ""),
		HuaweicloudUsername:  nullStringToVal(huaweicloudUsername, ""),
		HuaweicloudPassword:  nullStringToVal(huaweicloudPassword, ""),
		ContainerRuntime:     nullStringToVal(containerRuntime, "docker"),
	}, nil
}

func nullStringToVal(ns sql.NullString, def string) string {
	if ns.Valid {
		return ns.String
	}
	return def
}

func nullIntToVal(ni sql.NullInt64, def int) int {
	if ni.Valid {
		return int(ni.Int64)
	}
	return def
}

func nullBoolToVal(nb sql.NullBool, def bool) bool {
	if nb.Valid {
		return nb.Bool
	}
	return def
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
			  harbor_url = ?,
			  harbor_username = ?,
			  harbor_password = ?,
			  harbor_tls_cert = ?,
			  tencentcloud_username = ?,
			  tencentcloud_password = ?,
			  huaweicloud_username = ?,
			  huaweicloud_password = ?,
			  container_runtime = ?,
			  updated_at = CURRENT_TIMESTAMP
			  WHERE id = 1`

	_, err := db.Exec(query,
		s.ExportPath, s.RetryMaxAttempts, s.RetryIntervalSec, s.EnableWebhook,
		s.WebhookURL, s.WebhookType, s.ConcurrentPulls, s.DefaultPlatform,
		s.GzipCompression, s.GhcrToken,
		s.DockerHubUsername, s.DockerHubToken, s.QuayToken,
		s.AcrUsername, s.AcrPassword,
		s.EcrAccessKeyId, s.EcrSecretAccessKey, s.EcrRegion, s.GarToken,
		s.HarborUrl, s.HarborUsername, s.HarborPassword, s.HarborTlsCert,
		s.TencentcloudUsername, s.TencentcloudPassword,
		s.HuaweicloudUsername, s.HuaweicloudPassword,
		s.ContainerRuntime,
	)
	return err
}
