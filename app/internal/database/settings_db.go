package database

import (
	"database/sql"
	"docker-pull-manager/internal/config"
	"docker-pull-manager/internal/models"
)

func GetSettings(db *sql.DB) (*models.Settings, error) {
	query := `SELECT export_path, retry_max_attempts, retry_interval_sec, enable_webhook,
			  webhook_url, webhook_type, concurrent_pulls, default_platform, gzip_compression, 
			  ghcr_token, ghcr_username, ghcr_verified,
			  dockerhub_username, dockerhub_token, dockerhub_verified,
			  quay_username, quay_password, quay_verified,
			  acr_username, acr_password, acr_verified,
			  ecr_access_key_id, ecr_secret_access_key, ecr_region, ecr_verified,
			  gar_token, gar_verified,
			  harbor_url, harbor_username, harbor_password, harbor_tls_cert, harbor_verified,
			  tencentcloud_username, tencentcloud_password, tencentcloud_verified,
			  huaweicloud_username, huaweicloud_password, huaweicloud_verified,
			  container_runtime
			  FROM settings WHERE id = 1`

	var exportPath, webhookURL, webhookType, defaultPlatform, ghcrToken, ghcrUsername sql.NullString
	var dockerHubUsername, dockerHubToken, quayUsername, quayPassword, acrUsername, acrPassword sql.NullString
	var ecrAccessKeyId, ecrSecretAccessKey, ecrRegion, garToken sql.NullString
	var harborUrl, harborUsername, harborPassword, harborTlsCert sql.NullString
	var tencentcloudUsername, tencentcloudPassword sql.NullString
	var huaweicloudUsername, huaweicloudPassword, containerRuntime sql.NullString
	var retryMaxAttempts, retryIntervalSec, concurrentPulls, gzipCompression sql.NullInt64
	var enableWebhook sql.NullBool
	var ghcrVerified, dockerhubVerified, quayVerified, acrVerified, ecrVerified, garVerified sql.NullBool
	var harborVerified, tencentcloudVerified, huaweicloudVerified sql.NullBool

	err := db.QueryRow(query).Scan(
		&exportPath, &retryMaxAttempts, &retryIntervalSec, &enableWebhook,
		&webhookURL, &webhookType, &concurrentPulls, &defaultPlatform,
		&gzipCompression, &ghcrToken, &ghcrUsername, &ghcrVerified,
		&dockerHubUsername, &dockerHubToken, &dockerhubVerified,
		&quayUsername, &quayPassword, &quayVerified,
		&acrUsername, &acrPassword, &acrVerified,
		&ecrAccessKeyId, &ecrSecretAccessKey, &ecrRegion, &ecrVerified,
		&garToken, &garVerified,
		&harborUrl, &harborUsername, &harborPassword, &harborTlsCert, &harborVerified,
		&tencentcloudUsername, &tencentcloudPassword, &tencentcloudVerified,
		&huaweicloudUsername, &huaweicloudPassword, &huaweicloudVerified,
		&containerRuntime,
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
				ConcurrentPulls:      getDefaultConcurrentPulls(),
				DefaultPlatform:      "linux/amd64,linux/arm64",
				GzipCompression:      9,
				GhcrToken:            "",
				GhcrUsername:         "",
				GhcrVerified:         false,
				DockerHubUsername:    "",
				DockerHubToken:       "",
				DockerHubVerified:    false,
				QuayUsername:         "",
				QuayPassword:         "",
				QuayVerified:         false,
				AcrUsername:          "",
				AcrPassword:          "",
				AcrVerified:          false,
				EcrAccessKeyId:       "",
				EcrSecretAccessKey:   "",
				EcrRegion:            "",
				EcrVerified:          false,
				GarToken:             "",
				GarVerified:          false,
				HarborUrl:            "",
				HarborUsername:       "",
				HarborPassword:       "",
				HarborTlsCert:        "",
				HarborVerified:       false,
				TencentcloudUsername: "",
				TencentcloudPassword: "",
				TencentcloudVerified: false,
				HuaweicloudUsername:  "",
				HuaweicloudPassword:  "",
				HuaweicloudVerified:  false,
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
		ConcurrentPulls:      nullIntToVal(concurrentPulls, getDefaultConcurrentPulls()),
		DefaultPlatform:      nullStringToVal(defaultPlatform, "linux/amd64,linux/arm64"),
		GzipCompression:      nullIntToVal(gzipCompression, 9),
		GhcrToken:            nullStringToVal(ghcrToken, ""),
		GhcrUsername:         nullStringToVal(ghcrUsername, ""),
		GhcrVerified:         nullBoolToVal(ghcrVerified, false),
		DockerHubUsername:    nullStringToVal(dockerHubUsername, ""),
		DockerHubToken:       nullStringToVal(dockerHubToken, ""),
		DockerHubVerified:    nullBoolToVal(dockerhubVerified, false),
		QuayUsername:         nullStringToVal(quayUsername, ""),
		QuayPassword:         nullStringToVal(quayPassword, ""),
		QuayVerified:         nullBoolToVal(quayVerified, false),
		AcrUsername:          nullStringToVal(acrUsername, ""),
		AcrPassword:          nullStringToVal(acrPassword, ""),
		AcrVerified:          nullBoolToVal(acrVerified, false),
		EcrAccessKeyId:       nullStringToVal(ecrAccessKeyId, ""),
		EcrSecretAccessKey:   nullStringToVal(ecrSecretAccessKey, ""),
		EcrRegion:            nullStringToVal(ecrRegion, ""),
		EcrVerified:          nullBoolToVal(ecrVerified, false),
		GarToken:             nullStringToVal(garToken, ""),
		GarVerified:          nullBoolToVal(garVerified, false),
		HarborUrl:            nullStringToVal(harborUrl, ""),
		HarborUsername:       nullStringToVal(harborUsername, ""),
		HarborPassword:       nullStringToVal(harborPassword, ""),
		HarborTlsCert:        nullStringToVal(harborTlsCert, ""),
		HarborVerified:       nullBoolToVal(harborVerified, false),
		TencentcloudUsername: nullStringToVal(tencentcloudUsername, ""),
		TencentcloudPassword: nullStringToVal(tencentcloudPassword, ""),
		TencentcloudVerified: nullBoolToVal(tencentcloudVerified, false),
		HuaweicloudUsername:  nullStringToVal(huaweicloudUsername, ""),
		HuaweicloudPassword:  nullStringToVal(huaweicloudPassword, ""),
		HuaweicloudVerified:  nullBoolToVal(huaweicloudVerified, false),
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
			  ghcr_username = ?,
			  ghcr_verified = ?,
			  dockerhub_username = ?,
			  dockerhub_token = ?,
			  dockerhub_verified = ?,
			  quay_username = ?,
			  quay_password = ?,
			  quay_verified = ?,
			  acr_username = ?,
			  acr_password = ?,
			  acr_verified = ?,
			  ecr_access_key_id = ?,
			  ecr_secret_access_key = ?,
			  ecr_region = ?,
			  ecr_verified = ?,
			  gar_token = ?,
			  gar_verified = ?,
			  harbor_url = ?,
			  harbor_username = ?,
			  harbor_password = ?,
			  harbor_tls_cert = ?,
			  harbor_verified = ?,
			  tencentcloud_username = ?,
			  tencentcloud_password = ?,
			  tencentcloud_verified = ?,
			  huaweicloud_username = ?,
			  huaweicloud_password = ?,
			  huaweicloud_verified = ?,
			  container_runtime = ?,
			  updated_at = CURRENT_TIMESTAMP
			  WHERE id = 1`

	_, err := db.Exec(query,
		s.ExportPath, s.RetryMaxAttempts, s.RetryIntervalSec, s.EnableWebhook,
		s.WebhookURL, s.WebhookType, s.ConcurrentPulls, s.DefaultPlatform,
		s.GzipCompression, s.GhcrToken, s.GhcrUsername, s.GhcrVerified,
		s.DockerHubUsername, s.DockerHubToken, s.DockerHubVerified,
		s.QuayUsername, s.QuayPassword, s.QuayVerified,
		s.AcrUsername, s.AcrPassword, s.AcrVerified,
		s.EcrAccessKeyId, s.EcrSecretAccessKey, s.EcrRegion, s.EcrVerified,
		s.GarToken, s.GarVerified,
		s.HarborUrl, s.HarborUsername, s.HarborPassword, s.HarborTlsCert, s.HarborVerified,
		s.TencentcloudUsername, s.TencentcloudPassword, s.TencentcloudVerified,
		s.HuaweicloudUsername, s.HuaweicloudPassword, s.HuaweicloudVerified,
		s.ContainerRuntime,
	)
	return err
}