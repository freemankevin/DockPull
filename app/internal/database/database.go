package database

import (
	"database/sql"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

func Init(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbPath+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	if err != nil {
		return nil, err
	}

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

	_, _ = db.Exec(`INSERT OR IGNORE INTO settings (id) VALUES (1)`)

	return nil
}
