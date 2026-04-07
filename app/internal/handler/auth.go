package handler

import (
	"database/sql"
	"docker-pull-manager/internal/middleware"
	"docker-pull-manager/internal/models"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db *sql.DB
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.getUserByUsername(req.Username)
	if err != nil {
		fmt.Printf("\033[33m%s [WARN] User not found: %s, error: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), req.Username, err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}

	fmt.Printf("\033[36m%s [DEBUG] Found user: %+v\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"), user)

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		fmt.Printf("\033[33m%s [WARN] Password mismatch for user: %s, error: %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04:05"), req.Username, err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		Token: token,
		User:  *user,
	})
}

func (h *AuthHandler) getUserByUsername(username string) (*models.User, error) {
	query := `SELECT id, username, password, created_at FROM users WHERE username = ?`
	var user models.User
	err := h.db.QueryRow(query, username).Scan(&user.ID, &user.Username, &user.Password, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetInt64("user_id")
	username := c.GetString("username")

	c.JSON(http.StatusOK, models.User{
		ID:       userID,
		Username: username,
	})
}

func (h *AuthHandler) InitDefaultUser() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	result, err := h.db.Exec(`
		INSERT INTO users (username, password) VALUES ('admin', ?)
		ON CONFLICT(username) DO UPDATE SET password = excluded.password
	`, hashedPassword)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	fmt.Printf("\033[32m%s [INFO] Default user initialized/updated, rows affected: %d\033[0m\n",
		time.Now().Format("2006-01-02 15:04:05"), rowsAffected)

	return nil
}
