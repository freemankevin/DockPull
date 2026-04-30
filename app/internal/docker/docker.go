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
	"runtime"
	"strings"
	"sync"
	"time"

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
		opts := []client.Opt{client.WithAPIVersionNegotiation()}

		if s.cfg.ContainerRuntime == "podman" {
			if podmanHost := detectPodmanSocket(); podmanHost != "" {
				opts = append(opts, client.WithHost(podmanHost))
			}
		}

		if host := os.Getenv("CONTAINER_HOST"); host != "" {
			opts = append(opts, client.WithHost(host))
		}

		opts = append(opts, client.FromEnv)
		s.cli, s.cliErr = client.NewClientWithOpts(opts...)
	})
	return s.cli, s.cliErr
}

func detectPodmanSocket() string {
	if runtime.GOOS == "windows" {
		npipeHost := "npipe:////./pipe/podman-machine-default"
		return npipeHost
	}

	paths := []string{
		"unix:///run/podman/podman.sock",
		"unix:///var/run/podman/podman.sock",
	}

	if uid := os.Getuid(); uid > 0 {
		paths = append(paths,
			fmt.Sprintf("unix:///run/user/%d/podman/podman.sock", uid),
			fmt.Sprintf("unix:///var/run/user/%d/podman/podman.sock", uid),
		)
	}

	for _, path := range paths {
		socketPath := strings.TrimPrefix(path, "unix://")
		if _, err := os.Stat(socketPath); err == nil {
			return path
		}
	}

	return ""
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

	registry := detectRegistry(fullName)
	authConfig := s.getAuthConfigForRegistry(registry)
	if authConfig != nil {
		authJSON, _ := json.Marshal(authConfig)
		options.RegistryAuth = base64.URLEncoding.EncodeToString(authJSON)
	}

	reader, err := cli.ImagePull(ctx, fullName, options)
	if err != nil {
		return s.enrichPullError(err, registry, fullName)
	}
	defer reader.Close()

	_, err = io.Copy(io.Discard, reader)
	if err != nil {
		return s.enrichPullError(err, registry, fullName)
	}
	return nil
}

func (s *DockerService) getAuthConfigForRegistry(registry string) *types.AuthConfig {
	switch {
	case registry == "ghcr.io" && s.cfg.GhcrToken != "":
		return &types.AuthConfig{
			Username:      "oauth2",
			Password:      s.cfg.GhcrToken,
			ServerAddress: "ghcr.io",
		}
	case registry == "docker.io" || registry == "registry.hub.docker.com":
		if s.cfg.DockerHubUsername != "" && s.cfg.DockerHubToken != "" {
			return &types.AuthConfig{
				Username:      s.cfg.DockerHubUsername,
				Password:      s.cfg.DockerHubToken,
				ServerAddress: "https://index.docker.io/v1/",
			}
		}
	case registry == "quay.io" && s.cfg.QuayToken != "":
		return &types.AuthConfig{
			Username:      "oauth2",
			Password:      s.cfg.QuayToken,
			ServerAddress: "quay.io",
		}
	case strings.HasSuffix(registry, ".azurecr.io"):
		if s.cfg.AcrUsername != "" && s.cfg.AcrPassword != "" {
			return &types.AuthConfig{
				Username:      s.cfg.AcrUsername,
				Password:      s.cfg.AcrPassword,
				ServerAddress: registry,
			}
		}
	case strings.HasSuffix(registry, ".amazonaws.com") || strings.HasPrefix(registry, "public.ecr.aws"):
		if s.cfg.EcrAccessKeyId != "" && s.cfg.EcrSecretAccessKey != "" {
			return &types.AuthConfig{
				Username:      "AWS",
				Password:      s.cfg.EcrAccessKeyId + ":" + s.cfg.EcrSecretAccessKey,
				ServerAddress: registry,
			}
		}
	case strings.HasSuffix(registry, ".pkg.dev"):
		if s.cfg.GarToken != "" {
			return &types.AuthConfig{
				Username:      "oauth2accesstoken",
				Password:      s.cfg.GarToken,
				ServerAddress: registry,
			}
		}
	case strings.Contains(registry, "harbor") || (s.cfg.HarborUrl != "" && strings.HasPrefix(registry, s.cfg.HarborUrl)):
		if s.cfg.HarborUsername != "" && s.cfg.HarborPassword != "" {
			return &types.AuthConfig{
				Username:      s.cfg.HarborUsername,
				Password:      s.cfg.HarborPassword,
				ServerAddress: registry,
			}
		}
	case strings.HasSuffix(registry, ".tencentcloudcr.com") || strings.Contains(registry, "ccr.ccs.tencentyun.com"):
		if s.cfg.TencentcloudUsername != "" && s.cfg.TencentcloudPassword != "" {
			return &types.AuthConfig{
				Username:      s.cfg.TencentcloudUsername,
				Password:      s.cfg.TencentcloudPassword,
				ServerAddress: registry,
			}
		}
	case strings.HasSuffix(registry, ".myhuaweicloud.com") || strings.Contains(registry, "swr."):
		if s.cfg.HuaweicloudUsername != "" && s.cfg.HuaweicloudPassword != "" {
			return &types.AuthConfig{
				Username:      s.cfg.HuaweicloudUsername,
				Password:      s.cfg.HuaweicloudPassword,
				ServerAddress: registry,
			}
		}
	}
	return nil
}

func (s *DockerService) enrichPullError(err error, registry, fullName string) error {
	errMsg := err.Error()
	
	if strings.Contains(errMsg, "connection refused") {
		authConfig := s.getAuthConfigForRegistry(registry)
		if authConfig == nil {
			return fmt.Errorf("%s - Hint: This registry may require authentication. Please check Settings > Tokens to configure credentials for %s", errMsg, registry)
		}
		return fmt.Errorf("%s - Hint: Connection refused, the registry may be unreachable or authentication failed. Check your credentials in Settings > Tokens", errMsg)
	}
	
	if strings.Contains(errMsg, "unauthorized") || strings.Contains(errMsg, "authentication required") {
		return fmt.Errorf("%s - Hint: Please configure authentication token in Settings > Tokens for %s", errMsg, registry)
	}
	
	if strings.Contains(errMsg, "denied") || strings.Contains(errMsg, "access denied") {
		return fmt.Errorf("%s - Hint: Access denied. Check if the image exists and you have permission. Configure token in Settings > Tokens for %s", errMsg, registry)
	}
	
	if strings.Contains(errMsg, "rate limit") || strings.Contains(errMsg, "too many requests") {
		return fmt.Errorf("%s - Hint: Rate limit exceeded. Configure Docker Hub credentials in Settings > Tokens to increase pull limits", errMsg)
	}
	
	if strings.Contains(errMsg, "no such host") || strings.Contains(errMsg, "name or service not known") {
		return fmt.Errorf("%s - Hint: Registry host unreachable. Check network connectivity or registry address", errMsg)
	}
	
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

	runtime := "docker"
	if s.cfg.ContainerRuntime != "" {
		runtime = s.cfg.ContainerRuntime
	}

	cmd := exec.Command(runtime, "manifest", "inspect", fullName)
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

func DetectRuntime() (dockerAvailable, podmanAvailable bool) {
	dockerAvailable = false
	podmanAvailable = false

	if _, err := exec.LookPath("docker"); err == nil {
		cmd := exec.Command("docker", "info")
		if err := cmd.Run(); err == nil {
			dockerAvailable = true
		}
	}

	if _, err := exec.LookPath("podman"); err == nil {
		cmd := exec.Command("podman", "info")
		if err := cmd.Run(); err == nil {
			podmanAvailable = true
		}
	}

	return dockerAvailable, podmanAvailable
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

type LocalImage struct {
	ID           string   `json:"id"`
	RepoTags     []string `json:"repo_tags"`
	Size         int64    `json:"size"`
	CreatedAt    int64    `json:"created_at"`
	Repository   string   `json:"repository"`
	Tag          string   `json:"tag"`
	Architecture string   `json:"architecture"`
}

func (s *DockerService) ListLocalImages(ctx context.Context) ([]LocalImage, error) {
	cli, err := s.getClient()
	if err != nil {
		return nil, err
	}

	images, err := cli.ImageList(ctx, types.ImageListOptions{All: false})
	if err != nil {
		return nil, err
	}

	result := []LocalImage{}
	for _, img := range images {
		if len(img.RepoTags) == 0 {
			continue
		}
		for _, tag := range img.RepoTags {
			if tag == "<none>:<none>" {
				continue
			}
			repository, imageTag := splitRepoTag(tag)

			inspect, _, err := cli.ImageInspectWithRaw(ctx, img.ID)
			architecture := "unknown"
			if err == nil {
				architecture = inspect.Architecture
			}

			result = append(result, LocalImage{
				ID:           img.ID,
				RepoTags:     img.RepoTags,
				Size:         img.Size,
				CreatedAt:    img.Created,
				Repository:   repository,
				Tag:          imageTag,
				Architecture: architecture,
			})
		}
	}
	return result, nil
}

func splitRepoTag(tag string) (string, string) {
	lastColon := strings.LastIndex(tag, ":")
	if lastColon == -1 {
		return tag, "latest"
	}
	if strings.Contains(tag[lastColon:], "/") {
		return tag, "latest"
	}
	return tag[:lastColon], tag[lastColon+1:]
}

func (s *DockerService) DeleteLocalImage(ctx context.Context, imageID string, force bool) error {
	cli, err := s.getClient()
	if err != nil {
		return err
	}

	_, err = cli.ImageRemove(ctx, imageID, types.ImageRemoveOptions{Force: force})
	return err
}

func (s *DockerService) ExportLocalImage(ctx context.Context, repoTag string, architecture string, exportPath string) (string, error) {
	cli, err := s.getClient()
	if err != nil {
		return "", err
	}

	repo, tag := splitRepoTag(repoTag)
	if tag == "" {
		tag = "latest"
	}

	registry := detectRegistry(repo)
	imageNameClean := extractImageName(repo)

	timestamp := time.Now().Unix()
	arch := architecture
	if arch == "" || arch == "unknown" {
		arch = "amd64"
	}

	filename := fmt.Sprintf("%s_%s_%s_%s_%d.tar.gz", registry, imageNameClean, tag, arch, timestamp)

	fullExportPath := filepath.Join(exportPath, filename)

	if err := os.MkdirAll(exportPath, 0755); err != nil {
		return "", err
	}

	file, err := os.Create(fullExportPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	reader, err := cli.ImageSave(ctx, []string{repoTag})
	if err != nil {
		os.Remove(fullExportPath)
		return "", err
	}
	defer reader.Close()

	_, err = io.Copy(file, reader)
	if err != nil {
		os.Remove(fullExportPath)
		return "", err
	}

	return fullExportPath, nil
}
