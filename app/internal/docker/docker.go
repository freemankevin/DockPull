package docker

import (
	"context"
	"docker-pull-manager/internal/config"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
)

type DockerService struct {
	cli *client.Client
	cfg *config.Config
}

func NewDockerService(cfg *config.Config) *DockerService {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(fmt.Sprintf("Failed to create docker client: %v", err))
	}

	return &DockerService{
		cli: cli,
		cfg: cfg,
	}
}

func (s *DockerService) PullImage(ctx context.Context, fullName, platform string) error {
	options := types.ImagePullOptions{}
	if platform != "" {
		options.Platform = platform
	}

	reader, err := s.cli.ImagePull(ctx, fullName, options)
	if err != nil {
		return err
	}
	defer reader.Close()

	_, err = io.Copy(io.Discard, reader)
	return err
}

func (s *DockerService) ExportImage(ctx context.Context, fullName string) (string, error) {
	timestamp := time.Now().Format("20060102_150405")
	imageName := strings.ReplaceAll(strings.ReplaceAll(fullName, "/", "_"), ":", "_")
	filename := fmt.Sprintf("%s_%s.tar.gz", imageName, timestamp)
	exportPath := filepath.Join(s.cfg.ExportPath, filename)

	if err := os.MkdirAll(s.cfg.ExportPath, 0755); err != nil {
		return "", err
	}

	file, err := os.Create(exportPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	reader, err := s.cli.ImageSave(ctx, []string{fullName})
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
	images, err := s.cli.ImageList(ctx, types.ImageListOptions{})
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
