package database

import (
	"database/sql"
	"docker-pull-manager/internal/models"
)

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
