package database

import (
	"database/sql"
	"docker-pull-manager/internal/models"
)

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
