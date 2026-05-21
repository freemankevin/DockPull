package docker

import (
	"context"
	"cove/internal/config"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
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
	"github.com/docker/docker/pkg/stdcopy"
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

// ResetClient clears the cached Docker client so it will be recreated
// on the next API call. Call this after changing DockerHost or ContainerRuntime.
func (s *DockerService) ResetClient() {
	if s.cli != nil {
		s.cli.Close()
		s.cli = nil
	}
	s.cliErr = nil
	s.cliOnce = sync.Once{}
}

func (s *DockerService) getClient() (*client.Client, error) {
	s.cliOnce.Do(func() {
		// Build a list of candidate hosts to try, in order of preference
		candidates := []string{}

		if s.cfg.ContainerRuntime == "podman" {
			if podmanHost := detectPodmanSocket(); podmanHost != "" {
				candidates = append(candidates, podmanHost)
			}
		}

		if host := os.Getenv("CONTAINER_HOST"); host != "" {
			candidates = append(candidates, host)
		}

		if s.cfg.DockerHost != "" {
			candidates = append(candidates, s.cfg.DockerHost)
		}

		if runtime.GOOS == "windows" {
			// Try Docker Desktop named pipe first
			candidates = append(candidates, "npipe:////./pipe/docker_engine")
			// Then try WSL2 TCP
			if wslHost := detectWSL2Docker(); wslHost != "" {
				candidates = append(candidates, wslHost)
			}
		}

		var lastErr error
		for _, host := range candidates {
			opts := []client.Opt{client.WithAPIVersionNegotiation()}
			if host != "" {
				opts = append(opts, client.WithHost(host))
			}
			opts = append(opts, client.FromEnv)

			cli, err := client.NewClientWithOpts(opts...)
			if err != nil {
				lastErr = err
				continue
			}

			// Test connectivity with a short timeout
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			_, err = cli.Ping(ctx)
			cancel()

			if err == nil {
				s.cli = cli
				return
			}

			cli.Close()
			lastErr = err
		}

		// All candidates failed; do not fallback to a default client on Windows
		// because it will silently pick the non-existent Docker Desktop named pipe.
		if lastErr != nil {
			s.cliErr = lastErr
		} else {
			s.cliErr = fmt.Errorf("no reachable Docker/Podman host found")
		}
	})
	return s.cli, s.cliErr
}

func (s *DockerService) GetClient() (*client.Client, error) {
	return s.getClient()
}

// TestDockerHost validates connectivity to a specific Docker host.
// timeoutSec controls the TCP dial and HTTP client timeout (default 180).
func TestDockerHost(host string, timeoutSec int) error {
	if timeoutSec <= 0 {
		timeoutSec = 180
	}
	timeout := time.Duration(timeoutSec) * time.Second

	// Quick TCP check first
	parsed := strings.TrimPrefix(host, "tcp://")
	if parsed != host {
		conn, err := net.DialTimeout("tcp", parsed, timeout)
		if err != nil {
			return fmt.Errorf("tcp dial failed: %w", err)
		}
		conn.Close()
	}

	// Try HTTP GET /_ping directly (avoids Docker SDK Ping quirks)
	httpHost := strings.Replace(host, "tcp://", "http://", 1)
	httpHost = strings.Replace(httpHost, "npipe://", "http://", 1)
	if !strings.HasPrefix(httpHost, "http") {
		httpHost = "http://" + httpHost
	}

	client := &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
		},
	}
	resp, err := client.Get(httpHost + "/_ping")
	if err != nil {
		return fmt.Errorf("http ping failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %s", resp.Status)
	}
	return nil
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

func detectWindowsDockerSocket() string {
	// 1. Try Docker Desktop named pipe first (most common on Windows)
	// Note: Docker SDK will handle connection errors later
	if runtime.GOOS == "windows" {
		return "npipe:////./pipe/docker_engine"
	}

	// 2. Fallback to WSL2 Docker via TCP
	if wslHost := detectWSL2Docker(); wslHost != "" {
		return wslHost
	}

	return ""
}

func detectWSL2Docker() string {
	if runtime.GOOS != "windows" {
		return ""
	}

	// Try to get WSL2 IP via `wsl hostname -I`
	cmd := exec.Command("wsl", "hostname", "-I")
	output, err := cmd.Output()
	if err != nil {
		return ""
	}

	ips := strings.Fields(string(output))
	for _, ip := range ips {
		ip = strings.TrimSpace(ip)
		if ip == "" {
			continue
		}
		host := fmt.Sprintf("tcp://%s:2375", ip)
		if IsDockerReachable(host) {
			return host
		}
	}

	return ""
}

// IsDockerReachable checks if a Docker TCP host is reachable via quick dial
func IsDockerReachable(host string) bool {
	parsed := strings.TrimPrefix(host, "tcp://")
	if parsed == host {
		return false
	}
	conn, err := net.DialTimeout("tcp", parsed, 2*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// isDockerHostReachable checks if a Docker host is reachable.
// For TCP hosts it dials the port; for npipe/unix it trusts the user config.
func isDockerHostReachable(host string) bool {
	if strings.HasPrefix(host, "tcp://") {
		parsed := strings.TrimPrefix(host, "tcp://")
		conn, err := net.DialTimeout("tcp", parsed, 2*time.Second)
		if err != nil {
			return false
		}
		conn.Close()
		return true
	}
	// Non-TCP hosts (npipe, unix socket) are trusted directly
	return true
}

// DetectRemoteDockerHost probes for external Docker hosts (WSL2, etc.)
// Returns empty string if none found
func DetectRemoteDockerHost() string {
	if runtime.GOOS == "windows" {
		if wslHost := detectWSL2Docker(); wslHost != "" {
			return wslHost
		}
	}
	return ""
}

func (s *DockerService) PullImage(ctx context.Context, fullName, platform string) error {
	cli, err := s.getClient()
	if err != nil {
		return err
	}

	// If a specific platform is requested, remove any local image with the
	// same name:tag first. Docker's default graph driver can only store one
	// platform per tag; without removal Docker may report "up to date" and
	// skip re-pulling a different platform.
	if platform != "" {
		_, _ = cli.ImageRemove(ctx, fullName, types.ImageRemoveOptions{Force: true})
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
		username := "oauth2"
		if s.cfg.GhcrUsername != "" {
			username = s.cfg.GhcrUsername
		}
		return &types.AuthConfig{
			Username:      username,
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
	case registry == "quay.io":
		if s.cfg.QuayUsername != "" && s.cfg.QuayPassword != "" {
			return &types.AuthConfig{
				Username:      s.cfg.QuayUsername,
				Password:      s.cfg.QuayPassword,
				ServerAddress: "quay.io",
			}
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
		// Try new multi-instance configs first
		for _, hc := range s.cfg.HarborConfigs {
			if hc.URL != "" && strings.HasPrefix(registry, hc.URL) {
				return &types.AuthConfig{
					Username:      hc.Username,
					Password:      hc.Password,
					ServerAddress: registry,
				}
			}
		}
		// Fallback to legacy single config
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

func (s *DockerService) enrichLocalImageError(err error) error {
	errMsg := err.Error()

	if strings.Contains(errMsg, "connection refused") || strings.Contains(errMsg, "actively refused") {
		return fmt.Errorf("%s - Hint: Docker daemon refused connection. WSL2 IP may have changed. Run 'wsl hostname -I' in WSL2 to get the new IP and update Settings > Docker Host", errMsg)
	}

	if strings.Contains(errMsg, "client version") && strings.Contains(errMsg, "too old") {
		return fmt.Errorf("%s - Hint: Docker client API version is incompatible. Try restarting the backend or check Docker daemon version", errMsg)
	}

	if strings.Contains(errMsg, "timeout") || strings.Contains(errMsg, "context deadline exceeded") {
		return fmt.Errorf("%s - Hint: Docker daemon is not responding. Check if the daemon is running and the Docker Host address is correct", errMsg)
	}

	if strings.Contains(errMsg, "no such host") || strings.Contains(errMsg, "dial tcp") {
		return fmt.Errorf("%s - Hint: Cannot reach Docker host. Verify the Docker Host address in Settings", errMsg)
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
	ID         string   `json:"id"`
	RepoTags   []string `json:"repo_tags"`
	Size       int64    `json:"size"`
	CreatedAt  int64    `json:"created_at"`
	Repository string   `json:"repository"`
	Tag        string   `json:"tag"`
	Platform   string   `json:"platform"`
}

func (s *DockerService) ListLocalImages(ctx context.Context) ([]LocalImage, error) {
	cli, err := s.getClient()
	if err != nil {
		return nil, err
	}

	images, err := cli.ImageList(ctx, types.ImageListOptions{All: false})
	if err != nil {
		return nil, s.enrichLocalImageError(err)
	}

	// Inspect unique image IDs to get architecture, with a short timeout per call
	archMap := make(map[string]string)
	for _, img := range images {
		if _, ok := archMap[img.ID]; ok {
			continue
		}
		inspectCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		inspect, _, err := cli.ImageInspectWithRaw(inspectCtx, img.ID)
		cancel()
		if err == nil && inspect.Architecture != "" {
			archMap[img.ID] = inspect.Architecture
		} else {
			archMap[img.ID] = "unknown"
		}
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

			result = append(result, LocalImage{
				ID:         img.ID,
				RepoTags:   img.RepoTags,
				Size:       img.Size,
				CreatedAt:  img.Created,
				Repository: repository,
				Tag:        imageTag,
				Platform:   archMap[img.ID],
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

// ── Build ──

func (s *DockerService) BuildImage(ctx context.Context, dockerfilePath, tag string, buildArgs map[string]string) error {
	runtimeCmd := "docker"
	if s.cfg.ContainerRuntime != "" {
		runtimeCmd = s.cfg.ContainerRuntime
	}

	args := []string{"build", "-t", tag, "-f", dockerfilePath}
	for k, v := range buildArgs {
		args = append(args, "--build-arg", fmt.Sprintf("%s=%s", k, v))
	}
	contextDir := filepath.Dir(dockerfilePath)
	args = append(args, contextDir)

	cmd := exec.CommandContext(ctx, runtimeCmd, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("build failed: %v\nOutput: %s", err, string(output))
	}
	return nil
}

// ── Containers ──

type Container struct {
	ID      string   `json:"id"`
	Names   []string `json:"names"`
	Image   string   `json:"image"`
	Command string   `json:"command"`
	Created int64    `json:"created"`
	Status  string   `json:"status"`
	State   string   `json:"state"`
	Ports   []Port   `json:"ports"`
	Labels  map[string]string `json:"labels"`
	SizeRw  int64    `json:"size_rw"`
	SizeRootFs int64 `json:"size_root_fs"`
}

type Port struct {
	IP          string `json:"ip"`
	PrivatePort uint16 `json:"private_port"`
	PublicPort  uint16 `json:"public_port"`
	Type        string `json:"type"`
}

func (s *DockerService) ListContainers(ctx context.Context, all bool) ([]Container, error) {
	cli, err := s.getClient()
	if err != nil {
		return nil, err
	}

	containers, err := cli.ContainerList(ctx, types.ContainerListOptions{All: all})
	if err != nil {
		return nil, s.enrichLocalImageError(err)
	}

	result := make([]Container, 0, len(containers))
	for _, c := range containers {
		ports := make([]Port, 0, len(c.Ports))
		for _, p := range c.Ports {
			ports = append(ports, Port{
				IP:          p.IP,
				PrivatePort: p.PrivatePort,
				PublicPort:  p.PublicPort,
				Type:        p.Type,
			})
		}
		names := c.Names
		for i := range names {
			names[i] = strings.TrimPrefix(names[i], "/")
		}
		result = append(result, Container{
			ID:      c.ID,
			Names:   names,
			Image:   c.Image,
			Command: c.Command,
			Created: c.Created,
			Status:  c.Status,
			State:   c.State,
			Ports:   ports,
			Labels:  c.Labels,
			SizeRw:  c.SizeRw,
			SizeRootFs: c.SizeRootFs,
		})
	}
	return result, nil
}

func (s *DockerService) StartContainer(ctx context.Context, id string) error {
	cli, err := s.getClient()
	if err != nil {
		return err
	}
	return cli.ContainerStart(ctx, id, types.ContainerStartOptions{})
}

func (s *DockerService) StopContainer(ctx context.Context, id string, timeout *time.Duration) error {
	cli, err := s.getClient()
	if err != nil {
		return err
	}
	return cli.ContainerStop(ctx, id, timeout)
}

func (s *DockerService) RestartContainer(ctx context.Context, id string, timeout *time.Duration) error {
	cli, err := s.getClient()
	if err != nil {
		return err
	}
	return cli.ContainerRestart(ctx, id, timeout)
}

func (s *DockerService) RemoveContainer(ctx context.Context, id string, force bool) error {
	cli, err := s.getClient()
	if err != nil {
		return err
	}
	return cli.ContainerRemove(ctx, id, types.ContainerRemoveOptions{Force: force})
}

func (s *DockerService) GetContainerLogs(ctx context.Context, id string, tail int) (string, error) {
	cli, err := s.getClient()
	if err != nil {
		return "", err
	}

	if tail <= 0 {
		tail = 100
	}

	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       fmt.Sprintf("%d", tail),
		Timestamps: false,
	}

	reader, err := cli.ContainerLogs(ctx, id, options)
	if err != nil {
		return "", err
	}
	defer reader.Close()

	// Docker multiplexes stdout/stderr with an 8-byte header
	// stdcopy.StdCopy strips the headers
	var buf strings.Builder
	_, err = stdcopy.StdCopy(&buf, &buf, reader)
	if err != nil {
		return "", err
	}
	return buf.String(), nil
}

// ── Compose ──

type ComposeProject struct {
	Name     string           `json:"name"`
	Path     string           `json:"path"`
	Status   string           `json:"status"`
	Services []ComposeService `json:"services"`
}

type ComposeService struct {
	Name   string `json:"name"`
	Image  string `json:"image"`
	Status string `json:"status"`
	State  string `json:"state"`
	Ports  string `json:"ports"`
}

func (s *DockerService) ListComposeProjects(ctx context.Context, scanPath string) ([]ComposeProject, error) {
	if scanPath == "" {
		scanPath = "."
	}

	projects := []ComposeProject{}
	err := filepath.Walk(scanPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			return nil
		}
		name := info.Name()
		if name != "docker-compose.yml" && name != "docker-compose.yaml" && name != "compose.yml" && name != "compose.yaml" {
			return nil
		}
		dir := filepath.Dir(path)
		projectName := filepath.Base(dir)
		projects = append(projects, ComposeProject{
			Name:   projectName,
			Path:   path,
			Status: "unknown",
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	// Get status for each project
	for i := range projects {
		services, err := s.ComposeStatus(ctx, projects[i].Path)
		if err == nil {
			projects[i].Services = services
			if len(services) > 0 {
				running := 0
				for _, svc := range services {
					if svc.State == "running" {
						running++
					}
				}
				if running == len(services) {
					projects[i].Status = "running"
				} else if running > 0 {
					projects[i].Status = "partial"
				} else {
					projects[i].Status = "stopped"
				}
			}
		}
	}

	return projects, nil
}

func (s *DockerService) ComposeUp(ctx context.Context, projectPath string) error {
	runtimeCmd := "docker"
	if s.cfg.ContainerRuntime != "" {
		runtimeCmd = s.cfg.ContainerRuntime
	}

	cmd := exec.CommandContext(ctx, runtimeCmd, "compose", "-f", projectPath, "up", "-d")
	cmd.Dir = filepath.Dir(projectPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("compose up failed: %v\nOutput: %s", err, string(output))
	}
	return nil
}

func (s *DockerService) ComposeDown(ctx context.Context, projectPath string) error {
	runtimeCmd := "docker"
	if s.cfg.ContainerRuntime != "" {
		runtimeCmd = s.cfg.ContainerRuntime
	}

	cmd := exec.CommandContext(ctx, runtimeCmd, "compose", "-f", projectPath, "down")
	cmd.Dir = filepath.Dir(projectPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("compose down failed: %v\nOutput: %s", err, string(output))
	}
	return nil
}

func (s *DockerService) ComposeStatus(ctx context.Context, projectPath string) ([]ComposeService, error) {
	runtimeCmd := "docker"
	if s.cfg.ContainerRuntime != "" {
		runtimeCmd = s.cfg.ContainerRuntime
	}

	cmd := exec.CommandContext(ctx, runtimeCmd, "compose", "-f", projectPath, "ps", "--format", "json")
	cmd.Dir = filepath.Dir(projectPath)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("compose ps failed: %v", err)
	}

	// docker compose ps --format json outputs JSON array or lines of JSON objects
	var services []ComposeService
	trimmed := strings.TrimSpace(string(output))
	if trimmed == "" {
		return services, nil
	}

	if trimmed[0] == '[' {
		// JSON array
		if err := json.Unmarshal(output, &services); err != nil {
			return nil, err
		}
		return services, nil
	}

	// Lines of JSON objects
	lines := strings.Split(trimmed, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var svc ComposeService
		if err := json.Unmarshal([]byte(line), &svc); err != nil {
			continue
		}
		services = append(services, svc)
	}
	return services, nil
}
