package docker

import (
	"context"
	"docker-pull-manager/internal/config"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
)

type DockerService struct {
	cli     *client.Client
	cfg     *config.Config
	cliOnce sync.Once
	cliErr  error
}

func NewDockerService(cfg *config.Config) *DockerService {
	// Use lazy initialization - don't create client immediately
	return &DockerService{
		cfg: cfg,
	}
}

func (s *DockerService) getClient() (*client.Client, error) {
	s.cliOnce.Do(func() {
		s.cli, s.cliErr = client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	})
	return s.cli, s.cliErr
}

func (s *DockerService) PullImage(ctx context.Context, fullName, platform string) error {
	cli, err := s.getClient()
	if err != nil {
		return err
	}

	options := types.ImagePullOptions{}
	if platform != "" {
		options.Platform = platform
	}

	if strings.HasPrefix(fullName, "ghcr.io/") && s.cfg.GhcrToken != "" {
		authConfig := types.AuthConfig{
			Username:      "oauth2",
			Password:      s.cfg.GhcrToken,
			ServerAddress: "ghcr.io",
		}
		authJSON, _ := json.Marshal(authConfig)
		options.RegistryAuth = base64.URLEncoding.EncodeToString(authJSON)
	}

	reader, err := cli.ImagePull(ctx, fullName, options)
	if err != nil {
		return err
	}
	defer reader.Close()

	_, err = io.Copy(io.Discard, reader)
	return err
}

func detectRegistry(imageName string) string {
	parts := strings.Split(imageName, "/")

	if len(parts) == 1 {
		return "docker.io"
	}

	if len(parts) >= 2 {
		firstPart := parts[0]
		if strings.Contains(firstPart, ".") || firstPart == "localhost" {
			return firstPart
		}
		return "docker.io"
	}

	return "docker.io"
}

func extractImageName(imageName string) string {
	parts := strings.Split(imageName, "/")
	if len(parts) == 0 {
		return imageName
	}
	return parts[len(parts)-1]
}

func (s *DockerService) ExportImage(ctx context.Context, fullName, imageName, tag, platform string) (string, error) {
	cli, err := s.getClient()
	if err != nil {
		return "", err
	}

	registry := detectRegistry(imageName)

	platformClean := platform
	if idx := strings.LastIndex(platform, "/"); idx != -1 {
		platformClean = platform[idx+1:]
	}

	imageNameClean := extractImageName(imageName)
	tagClean := tag
	if tagClean == "" {
		tagClean = "latest"
	}

	filename := fmt.Sprintf("%s_%s_%s_%s.tar.gz", registry, imageNameClean, tagClean, platformClean)
	exportPath := filepath.Join(s.cfg.ExportPath, filename)

	if err := os.MkdirAll(s.cfg.ExportPath, 0755); err != nil {
		return "", err
	}

	file, err := os.Create(exportPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	reader, err := cli.ImageSave(ctx, []string{fullName})
	if err != nil {
		os.Remove(exportPath)
		return "", err
	}
	defer reader.Close()

	_, err = io.Copy(file, reader)
	if err != nil {
		os.Remove(exportPath)
		return "", err
	}

	return exportPath, nil
}

func (s *DockerService) ImageExists(ctx context.Context, fullName string) (bool, error) {
	cli, err := s.getClient()
	if err != nil {
		return false, err
	}

	images, err := cli.ImageList(ctx, types.ImageListOptions{})
	if err != nil {
		return false, err
	}

	for _, img := range images {
		for _, tag := range img.RepoTags {
			if tag == fullName {
				return true, nil
			}
		}
	}

	return false, nil
}

func (s *DockerService) Close() {
	if s.cli != nil {
		s.cli.Close()
	}
}

type ManifestInfo struct {
	SchemaVersion int    `json:"schemaVersion"`
	MediaType     string `json:"mediaType"`
	Manifests     []struct {
		MediaType string `json:"mediaType"`
		Size      int    `json:"size"`
		Digest    string `json:"digest"`
		Platform  struct {
			Architecture string `json:"architecture"`
			OS           string `json:"os"`
			Variant      string `json:"variant,omitempty"`
		} `json:"platform"`
	} `json:"manifests"`
}

func (s *DockerService) GetImagePlatforms(imageName, tag string) ([]string, error) {
	fullName := imageName
	if tag != "" {
		fullName = imageName + ":" + tag
	}

	cmd := exec.Command("docker", "manifest", "inspect", fullName)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to inspect manifest: %v", err)
	}

	var manifest ManifestInfo
	if err := json.Unmarshal(output, &manifest); err != nil {
		return nil, fmt.Errorf("failed to parse manifest: %v", err)
	}

	platforms := []string{}
	for _, m := range manifest.Manifests {
		platform := fmt.Sprintf("%s/%s", m.Platform.OS, m.Platform.Architecture)
		if m.Platform.Variant != "" {
			platform = fmt.Sprintf("%s/%s/%s", m.Platform.OS, m.Platform.Architecture, m.Platform.Variant)
		}
		platforms = append(platforms, platform)
	}

	return platforms, nil
}

func (s *DockerService) GetImagePlatformsFromRegistry(imageName, tag string) ([]string, error) {
	repo := imageName
	if strings.Contains(imageName, "/") {
		parts := strings.Split(imageName, "/")
		if len(parts) == 2 {
			repo = parts[0] + "/" + parts[1]
		} else if len(parts) == 3 {
			repo = parts[1] + "/" + parts[2]
		}
	} else {
		repo = "library/" + imageName
	}

	url := fmt.Sprintf("https://registry.hub.docker.com/v2/repositories/%s/tags/%s", repo, tag)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to get image info from registry")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var data struct {
		Images []struct {
			Architecture string `json:"architecture"`
			OS           string `json:"os"`
		} `json:"images"`
	}

	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}

	platforms := []string{}
	for _, img := range data.Images {
		platform := fmt.Sprintf("%s/%s", img.OS, img.Architecture)
		platforms = append(platforms, platform)
	}

	return platforms, nil
}
