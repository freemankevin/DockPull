package handler

import (
	"database/sql"
	"docker-pull-manager/internal/config"
	"docker-pull-manager/internal/docker"
	"docker-pull-manager/internal/service"
)

type Handler struct {
	imageService   *service.ImageService
	dockerService  *docker.DockerService
	webhookService *service.WebhookService
	cfg            *config.Config
	db             *sql.DB
}

func NewHandler(imageService *service.ImageService, dockerService *docker.DockerService, webhookService *service.WebhookService, cfg *config.Config, db *sql.DB) *Handler {
	return &Handler{
		imageService:   imageService,
		dockerService:  dockerService,
		webhookService: webhookService,
		cfg:            cfg,
		db:             db,
	}
}
