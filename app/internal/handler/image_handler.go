package handler

import (
	"docker-pull-manager/internal/models"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListImages(c *gin.Context) {
	images, err := h.imageService.GetImages()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, images)
}

func (h *Handler) CreateImage(c *gin.Context) {
	var req models.CreateImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	image, err := h.imageService.CreateImage(&req)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "duplicate": true})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, image)
}

func (h *Handler) DeleteImage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.imageService.DeleteImage(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) UpdateImage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	image, err := h.imageService.UpdateImage(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, image)
}

func (h *Handler) GetImageLogs(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	logs, err := h.imageService.GetImageLogs(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func (h *Handler) PullImage(c *gin.Context) {
	_, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	go h.imageService.ProcessPendingImages()

	c.JSON(http.StatusOK, gin.H{"message": "pull started"})
}

func (h *Handler) ExportImage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	path, err := h.imageService.ExportImage(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"path": path})
}

func (h *Handler) GetStats(c *gin.Context) {
	images, err := h.imageService.GetImages()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var total, success, failed, pending int
	for _, img := range images {
		total++
		switch img.Status {
		case "success":
			success++
		case "failed":
			failed++
		case "pending", "pulling":
			pending++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total":   total,
		"success": success,
		"failed":  failed,
		"pending": pending,
	})
}

func (h *Handler) CheckPlatforms(c *gin.Context) {
	name := c.Query("name")
	tag := c.Query("tag")

	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	if tag == "" {
		tag = "latest"
	}

	platforms, err := h.dockerService.GetImagePlatforms(name, tag)
	if err != nil {
		platforms, err = h.dockerService.GetImagePlatformsFromRegistry(name, tag)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"platforms": []string{"linux/amd64", "linux/arm64"}})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"platforms": platforms})
}

func (h *Handler) CheckAuthConfig(c *gin.Context) {
	name := c.Query("name")

	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	registry := detectRegistryFromName(name)
	result := h.checkRegistryAuth(registry)

	c.JSON(http.StatusOK, result)
}

func detectRegistryFromName(name string) string {
	parts := strings.Split(name, "/")
	if len(parts) == 1 {
		return "docker.io"
	}
	firstPart := parts[0]
	if strings.Contains(firstPart, ".") || firstPart == "localhost" {
		return firstPart
	}
	return "docker.io"
}

func (h *Handler) checkRegistryAuth(registry string) gin.H {
	result := gin.H{
		"registry":     registry,
		"needs_auth":   false,
		"has_auth":     false,
		"auth_type":    "",
		"suggestion":   "",
	}

	switch registry {
	case "ghcr.io":
		if h.cfg.GhcrToken != "" {
			result["has_auth"] = true
			result["auth_type"] = "ghcr"
		}
	case "docker.io", "registry.hub.docker.com":
		if h.cfg.DockerHubUsername != "" && h.cfg.DockerHubToken != "" {
			result["has_auth"] = true
			result["auth_type"] = "dockerhub"
		}
	case "quay.io":
		if h.cfg.QuayUsername != "" && h.cfg.QuayPassword != "" {
			result["has_auth"] = true
			result["auth_type"] = "quay"
		}
	default:
		if strings.Contains(registry, "azurecr.io") {
			result["needs_auth"] = true
			result["auth_type"] = "acr"
			if h.cfg.AcrUsername != "" && h.cfg.AcrPassword != "" {
				result["has_auth"] = true
			} else {
				result["suggestion"] = "Please configure Azure Container Registry credentials in Settings > Tokens"
			}
		} else if strings.HasSuffix(registry, ".amazonaws.com") {
			result["needs_auth"] = true
			result["auth_type"] = "ecr"
			if h.cfg.EcrAccessKeyId != "" && h.cfg.EcrSecretAccessKey != "" {
				result["has_auth"] = true
			} else {
				result["suggestion"] = "Please configure AWS ECR credentials in Settings > Tokens"
			}
		} else if strings.HasPrefix(registry, "public.ecr.aws") {
			if h.cfg.EcrAccessKeyId != "" && h.cfg.EcrSecretAccessKey != "" {
				result["has_auth"] = true
				result["auth_type"] = "ecr"
			}
		} else if strings.HasSuffix(registry, ".pkg.dev") || strings.HasPrefix(registry, "asia-east1-docker.pkg.dev") {
			result["needs_auth"] = true
			result["auth_type"] = "gar"
			if h.cfg.GarToken != "" {
				result["has_auth"] = true
			} else {
				result["suggestion"] = "Please configure Google Artifact Registry token in Settings > Tokens"
			}
		} else if strings.Contains(registry, "harbor") || (h.cfg.HarborUrl != "" && strings.HasPrefix(registry, h.cfg.HarborUrl)) {
			result["needs_auth"] = true
			result["auth_type"] = "harbor"
			if h.cfg.HarborUsername != "" && h.cfg.HarborPassword != "" {
				result["has_auth"] = true
			} else {
				result["suggestion"] = "Please configure Harbor credentials in Settings > Tokens"
			}
		} else if strings.HasSuffix(registry, ".tencentcloudcr.com") || strings.Contains(registry, "ccr.ccs.tencentyun.com") {
			result["needs_auth"] = true
			result["auth_type"] = "tencentcloud"
			if h.cfg.TencentcloudUsername != "" && h.cfg.TencentcloudPassword != "" {
				result["has_auth"] = true
			} else {
				result["suggestion"] = "Please configure Tencent Cloud Container Registry credentials in Settings > Tokens"
			}
		} else if strings.HasSuffix(registry, ".myhuaweicloud.com") || strings.Contains(registry, "swr.") {
			result["needs_auth"] = true
			result["auth_type"] = "huaweicloud"
			if h.cfg.HuaweicloudUsername != "" && h.cfg.HuaweicloudPassword != "" {
				result["has_auth"] = true
			} else {
				result["suggestion"] = "Please configure Huawei Cloud SWR credentials in Settings > Tokens"
			}
		}
	}

	return result
}
