package database

import (
	"database/sql"
	"docker-pull-manager/internal/models"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

func Init(dbPath string) (*sql.DB, error) {
	// Use optimized SQLite settings for faster startup
	db, err := sql.Open("sqlite", dbPath+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	if err != nil {
		return nil, err
	}

	// Optimize connection pool for single-user application
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(time.Hour)

	if err := createTables(db); err != nil {
		return nil, err
	}

	if err := migrateDatabase(db); err != nil {
		return nil, err
	}

	return db, nil
}

func migrateDatabase(db *sql.DB) error {
	columns := []string{
		"dockerhub_username TEXT DEFAULT ''",
		"dockerhub_token TEXT DEFAULT ''",
		"quay_token TEXT DEFAULT ''",
		"acr_username TEXT DEFAULT ''",
		"acr_password TEXT DEFAULT ''",
		"ecr_access_key_id TEXT DEFAULT ''",
		"ecr_secret_access_key TEXT DEFAULT ''",
		"ecr_region TEXT DEFAULT ''",
		"gar_token TEXT DEFAULT ''",
	}

	for _, column := range columns {
		parts := strings.SplitN(column, " ", 2)
		if len(parts) != 2 {
			continue
		}
		columnName := parts[0]

		var exists int
		err := db.QueryRow(`SELECT COUNT(*) FROM pragma_table_info('settings') WHERE name = ?`, columnName).Scan(&exists)
		if err != nil {
			return err
		}

		if exists == 0 {
			_, err := db.Exec(`ALTER TABLE settings ADD COLUMN ` + column)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func createTables(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS images (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			tag TEXT NOT NULL DEFAULT 'latest',
			full_name TEXT NOT NULL,
			platform TEXT DEFAULT 'linux/amd64',
			status TEXT DEFAULT 'pending',
			retry_count INTEGER DEFAULT 0,
			error_message TEXT,
			export_path TEXT,
			exported_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			is_auto_export BOOLEAN DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS image_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			image_id INTEGER NOT NULL,
			action TEXT NOT NULL,
			message TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS settings (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			export_path TEXT,
			retry_max_attempts INTEGER DEFAULT 0,
			retry_interval_sec INTEGER DEFAULT 30,
			enable_webhook BOOLEAN DEFAULT 0,
			webhook_url TEXT DEFAULT '',
			webhook_type TEXT DEFAULT 'dingtalk',
			concurrent_pulls INTEGER DEFAULT 3,
			default_platform TEXT DEFAULT 'linux/amd64,linux/arm64',
			gzip_compression INTEGER DEFAULT 9,
			ghcr_token TEXT DEFAULT '',
			dockerhub_username TEXT DEFAULT '',
			dockerhub_token TEXT DEFAULT '',
			quay_token TEXT DEFAULT '',
			acr_username TEXT DEFAULT '',
			acr_password TEXT DEFAULT '',
			ecr_access_key_id TEXT DEFAULT '',
			ecr_secret_access_key TEXT DEFAULT '',
			ecr_region TEXT DEFAULT '',
			gar_token TEXT DEFAULT '',
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_images_status ON images(status)`,
		`CREATE INDEX IF NOT EXISTS idx_images_full_name ON images(full_name)`,
		`CREATE INDEX IF NOT EXISTS idx_logs_image_id ON image_logs(image_id)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return err
		}
	}

	// Insert default settings if not exists
	_, _ = db.Exec(`INSERT OR IGNORE INTO settings (id) VALUES (1)`)

	return nil
}

func CreateImage(db *sql.DB, image *models.Image) error {
	query := `INSERT INTO images (name, tag, full_name, platform, status, is_auto_export) 
			  VALUES (?, ?, ?, ?, ?, ?)`

	image.FullName = image.Name + ":" + image.Tag
	if image.Platform == "" {
		image.Platform = "linux/amd64"
	}

	result, err := db.Exec(query, image.Name, image.Tag, image.FullName,
		image.Platform, image.Status, image.IsAutoExport)
	if err != nil {
		return err
	}

	image.ID, _ = result.LastInsertId()
	return nil
}

func GetImages(db *sql.DB) ([]models.Image, error) {
	query := `SELECT id, name, tag, full_name, platform, status, retry_count, 
			  error_message, export_path, exported_at, created_at, updated_at, is_auto_export 
			  FROM images ORDER BY created_at DESC`

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var images []models.Image
	for rows.Next() {
		var img models.Image
		err := rows.Scan(&img.ID, &img.Name, &img.Tag, &img.FullName, &img.Platform,
			&img.Status, &img.RetryCount, &img.ErrorMessage, &img.ExportPath,
			&img.ExportedAt, &img.CreatedAt, &img.UpdatedAt, &img.IsAutoExport)
		if err != nil {
			return nil, err
		}
		images = append(images, img)
	}

	return images, nil
}

func GetImageByID(db *sql.DB, id int64) (*models.Image, error) {
	query := `SELECT id, name, tag, full_name, platform, status, retry_count, 
			  error_message, export_path, exported_at, created_at, updated_at, is_auto_export 
			  FROM images WHERE id = ?`

	var img models.Image
	err := db.QueryRow(query, id).Scan(&img.ID, &img.Name, &img.Tag, &img.FullName,
		&img.Platform, &img.Status, &img.RetryCount, &img.ErrorMessage, &img.ExportPath,
		&img.ExportedAt, &img.CreatedAt, &img.UpdatedAt, &img.IsAutoExport)
	if err != nil {
		return nil, err
	}

	return &img, nil
}

func UpdateImageStatus(db *sql.DB, id int64, status string, errorMsg string) error {
	query := `UPDATE images SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, status, errorMsg, id)
	return err
}

func IncrementRetryCount(db *sql.DB, id int64) error {
	query := `UPDATE images SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, id)
	return err
}

func UpdateImageExport(db *sql.DB, id int64, exportPath string) error {
	query := `UPDATE images SET export_path = ?, exported_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, exportPath, id)
	return err
}

func DeleteImage(db *sql.DB, id int64) error {
	query := `DELETE FROM images WHERE id = ?`
	_, err := db.Exec(query, id)
	return err
}

func UpdateImage(db *sql.DB, id int64, name, tag, fullName, platform string, isAutoExport bool) error {
	query := `UPDATE images SET name = ?, tag = ?, full_name = ?, platform = ?, is_auto_export = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, name, tag, fullName, platform, isAutoExport, id)
	return err
}

func UpdateImageAndReset(db *sql.DB, id int64, name, tag, fullName, platform string, isAutoExport bool) error {
	query := `UPDATE images SET name = ?, tag = ?, full_name = ?, platform = ?, is_auto_export = ?, status = 'pending', retry_count = 0, error_message = NULL, export_path = NULL, exported_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, name, tag, fullName, platform, isAutoExport, id)
	return err
}

func CreateLog(db *sql.DB, log *models.ImageLog) error {
	query := `INSERT INTO image_logs (image_id, action, message) VALUES (?, ?, ?)`
	result, err := db.Exec(query, log.ImageID, log.Action, log.Message)
	if err != nil {
		return err
	}
	log.ID, _ = result.LastInsertId()
	return nil
}

func GetImageLogs(db *sql.DB, imageID int64) ([]models.ImageLog, error) {
	query := `SELECT id, image_id, action, message, created_at FROM image_logs 
			  WHERE image_id = ? ORDER BY created_at DESC`

	rows, err := db.Query(query, imageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.ImageLog
	for rows.Next() {
		var log models.ImageLog
		err := rows.Scan(&log.ID, &log.ImageID, &log.Action, &log.Message, &log.CreatedAt)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, nil
}

func GetPendingImages(db *sql.DB) ([]models.Image, error) {
	query := `SELECT id, name, tag, full_name, platform, status, retry_count, 
			  error_message, export_path, exported_at, created_at, updated_at, is_auto_export 
			  FROM images WHERE status IN ('pending', 'failed') ORDER BY created_at ASC`

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var images []models.Image
	for rows.Next() {
		var img models.Image
		err := rows.Scan(&img.ID, &img.Name, &img.Tag, &img.FullName, &img.Platform,
			&img.Status, &img.RetryCount, &img.ErrorMessage, &img.ExportPath,
			&img.ExportedAt, &img.CreatedAt, &img.UpdatedAt, &img.IsAutoExport)
		if err != nil {
			return nil, err
		}
		images = append(images, img)
	}

	return images, nil
}

// GetImageByNameTagPlatform checks if an image with the same name, tag and platform exists
// Returns the image if found regardless of status
func GetImageByNameTagPlatform(db *sql.DB, name, tag, platform string) (*models.Image, error) {
	query := `SELECT id, name, tag, full_name, platform, status, retry_count,
			  error_message, export_path, exported_at, created_at, updated_at, is_auto_export
			  FROM images WHERE name = ? AND tag = ? AND platform = ?`

	var img models.Image
	err := db.QueryRow(query, name, tag, platform).Scan(&img.ID, &img.Name, &img.Tag, &img.FullName,
		&img.Platform, &img.Status, &img.RetryCount, &img.ErrorMessage, &img.ExportPath,
		&img.ExportedAt, &img.CreatedAt, &img.UpdatedAt, &img.IsAutoExport)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &img, nil
}

// GetActiveImageByNameTagPlatform checks if an image with the same name, tag and platform exists
// with status 'pending' or 'pulling' (active status)
func GetActiveImageByNameTagPlatform(db *sql.DB, name, tag, platform string) (*models.Image, error) {
	query := `SELECT id, name, tag, full_name, platform, status, retry_count,
			  error_message, export_path, exported_at, created_at, updated_at, is_auto_export
			  FROM images WHERE name = ? AND tag = ? AND platform = ? AND status IN ('pending', 'pulling')`

	var img models.Image
	err := db.QueryRow(query, name, tag, platform).Scan(&img.ID, &img.Name, &img.Tag, &img.FullName,
		&img.Platform, &img.Status, &img.RetryCount, &img.ErrorMessage, &img.ExportPath,
		&img.ExportedAt, &img.CreatedAt, &img.UpdatedAt, &img.IsAutoExport)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &img, nil
}

// GetSettings retrieves all settings from database
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
				ExportPath:         "./exports",
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

// UpdateSettings updates settings in database
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
