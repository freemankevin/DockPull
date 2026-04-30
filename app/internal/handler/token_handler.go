package handler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type TestTokenRequest struct {
	Registry string `json:"registry" binding:"required"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	Token    string `json:"token,omitempty"`
	Cert     string `json:"cert,omitempty"`
	Region   string `json:"region,omitempty"`
	URL      string `json:"url,omitempty"`
}

type GitHubUserResponse struct {
	Login string `json:"login"`
}

func (h *Handler) TestTokenAuth(c *gin.Context) {
	var req TestTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := h.testRegistryAuth(req)
	c.JSON(http.StatusOK, result)
}

func (h *Handler) testRegistryAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	switch {
	case req.Registry == "ghcr.io":
		return h.testGhcrAuth(req)
	case req.Registry == "docker.io":
		return h.testDockerHubAuth(req)
	case req.Registry == "quay.io":
		return h.testQuayAuth(req)
	case strings.Contains(req.Registry, "azurecr.io"):
		return h.testAzureCrAuth(req)
	case strings.HasPrefix(req.Registry, "public.ecr.aws") || strings.HasSuffix(req.Registry, ".amazonaws.com"):
		return h.testEcrAuth(req)
	case strings.HasSuffix(req.Registry, ".pkg.dev"):
		return h.testGarAuth(req)
	case strings.Contains(req.Registry, "harbor") || req.URL != "":
		return h.testHarborAuth(req)
	case strings.HasSuffix(req.Registry, ".tencentcloudcr.com") || strings.Contains(req.Registry, "ccr.ccs.tencentyun.com"):
		return h.testTencentCloudAuth(req)
	case strings.HasSuffix(req.Registry, ".myhuaweicloud.com") || strings.Contains(req.Registry, "swr."):
		return h.testHuaweiCloudAuth(req)
	default:
		result["message"] = "Unknown registry type"
		return result
	}
}

func (h *Handler) testGhcrAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	username := req.Username
	token := req.Token

	if username == "" {
		result["message"] = "GitHub username is required"
		return result
	}

	if token == "" {
		result["message"] = "GitHub token is required"
		return result
	}

	githubUser, scopes, err := h.verifyGitHubToken(token)
	if err != nil {
		result["message"] = fmt.Sprintf("GitHub API verification failed: %v", err)
		return result
	}

	if githubUser != username {
		result["message"] = fmt.Sprintf("Token belongs to user '%s', but you entered '%s'", githubUser, username)
		return result
	}

	hasPackagesScope := false
	for _, scope := range scopes {
		if strings.Contains(scope, "read:packages") || strings.Contains(scope, "packages") {
			hasPackagesScope = true
			break
		}
	}

	if !hasPackagesScope {
		result["message"] = "Token lacks 'read:packages' scope. Please create a token with read:packages permission."
		return result
	}

	ghcrVerified := h.verifyGhcrAccess(username, token)
	if !ghcrVerified {
		result["message"] = "Token verified with GitHub, but failed to authenticate with ghcr.io"
		return result
	}

	result["success"] = true
	result["message"] = fmt.Sprintf("Authenticated as %s with read:packages scope", githubUser)
	return result
}

func (h *Handler) verifyGitHubToken(token string) (string, []string, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return "", nil, fmt.Errorf("failed to connect to GitHub API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		return "", nil, fmt.Errorf("invalid or expired token")
	}
	if resp.StatusCode != 200 {
		return "", nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	scopesHeader := resp.Header.Get("X-OAuth-Scopes")
	var scopes []string
	if scopesHeader != "" {
		scopes = strings.Split(scopesHeader, ",")
		for i, s := range scopes {
			scopes[i] = strings.TrimSpace(s)
		}
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", scopes, err
	}

	var user GitHubUserResponse
	if err := json.Unmarshal(body, &user); err != nil {
		return "", scopes, err
	}

	return user.Login, scopes, nil
}

func (h *Handler) verifyGhcrAccess(username, token string) bool {
	client := &http.Client{Timeout: 10 * time.Second}

	reqUrl := "https://ghcr.io/token?service=ghcr.io&scope=repository:github/safe-settings:pull"
	req, err := http.NewRequest("GET", reqUrl, nil)
	if err != nil {
		return false
	}

	auth := base64.StdEncoding.EncodeToString([]byte(username + ":" + token))
	req.Header.Set("Authorization", "Basic "+auth)

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return false
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false
	}

	var tokenResp struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return false
	}

	return tokenResp.Token != ""
}

func (h *Handler) testDockerHubAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	username := req.Username
	password := req.Password

	if username == "" {
		result["message"] = "Docker Hub username is required"
		return result
	}

	if password == "" {
		result["message"] = "Docker Hub password/token is required"
		return result
	}

	client := &http.Client{Timeout: 10 * time.Second}

	reqUrl := "https://hub.docker.com/v2/users/login/"
	body := strings.NewReader(fmt.Sprintf(`{"username":"%s","password":"%s"}`, username, password))

	httpReq, err := http.NewRequest("POST", reqUrl, body)
	if err != nil {
		result["message"] = fmt.Sprintf("Failed to create request: %v", err)
		return result
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	if err != nil {
		result["message"] = fmt.Sprintf("Failed to connect to Docker Hub: %v", err)
		return result
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		result["message"] = "Invalid username or password"
		return result
	}

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		result["message"] = fmt.Sprintf("Docker Hub returned status %d: %s", resp.StatusCode, string(respBody))
		return result
	}

	var loginResp struct {
		Token string `json:"token"`
	}
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		result["message"] = fmt.Sprintf("Failed to read response: %v", err)
		return result
	}

	if err := json.Unmarshal(respBody, &loginResp); err != nil {
		result["message"] = fmt.Sprintf("Failed to parse response: %v", err)
		return result
	}

	if loginResp.Token == "" {
		result["message"] = "Login successful but no token returned"
		return result
	}

	registryVerified := h.verifyDockerRegistryV2Auth("https://index.docker.io/v2/", username, password)
	if !registryVerified {
		result["message"] = "Docker Hub login successful, but registry authentication failed"
		return result
	}

	result["success"] = true
	result["message"] = fmt.Sprintf("Authenticated as %s", username)
	return result
}

func (h *Handler) verifyDockerRegistryV2Auth(baseUrl, username, password string) bool {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("GET", baseUrl, nil)
	if err != nil {
		return false
	}

	auth := base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
	req.Header.Set("Authorization", "Basic "+auth)

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == 200 || resp.StatusCode == 401
}

func (h *Handler) testQuayAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	username := req.Username
	password := req.Password

	if username == "" {
		result["message"] = "Quay username is required"
		return result
	}

	if password == "" {
		result["message"] = "Quay password is required"
		return result
	}

	client := &http.Client{Timeout: 10 * time.Second}

	reqUrl := "https://quay.io/v2/auth?service=quay.io"
	httpReq, err := http.NewRequest("GET", reqUrl, nil)
	if err != nil {
		result["message"] = fmt.Sprintf("Failed to create request: %v", err)
		return result
	}

	auth := base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
	httpReq.Header.Set("Authorization", "Basic "+auth)

	resp, err := client.Do(httpReq)
	if err != nil {
		result["message"] = fmt.Sprintf("Failed to connect to Quay: %v", err)
		return result
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		body, _ := io.ReadAll(resp.Body)
		if strings.Contains(string(body), "Too many login attempts") {
			result["message"] = "Account locked due to too many failed attempts. Please reset password at quay.io"
		} else {
			result["message"] = "Invalid username or password"
		}
		return result
	}

	if resp.StatusCode == 200 {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			result["message"] = fmt.Sprintf("Failed to read response: %v", err)
			return result
		}

		var tokenResp struct {
			Token string `json:"token"`
		}
		if err := json.Unmarshal(body, &tokenResp); err != nil {
			result["message"] = fmt.Sprintf("Failed to parse response: %v", err)
			return result
		}

		if tokenResp.Token != "" {
			result["success"] = true
			result["message"] = fmt.Sprintf("Authenticated as %s", username)
			return result
		}
	}

	result["message"] = fmt.Sprintf("Quay returned status %d", resp.StatusCode)
	return result
}

func (h *Handler) testAzureCrAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	username := req.Username
	password := req.Password
	registry := req.Registry

	if username == "" {
		result["message"] = "Azure Container Registry username is required"
		return result
	}

	if password == "" {
		result["message"] = "Azure Container Registry password is required"
		return result
	}

	registryUrl := fmt.Sprintf("https://%s/v2/", registry)
	verified := h.verifyDockerRegistryV2Auth(registryUrl, username, password)

	if !verified {
		result["message"] = "Authentication failed"
		return result
	}

	result["success"] = true
	result["message"] = fmt.Sprintf("Authenticated to %s", registry)
	return result
}

func (h *Handler) testEcrAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	accessKey := req.Username
	secretKey := req.Password

	if accessKey == "" {
		result["message"] = "AWS Access Key ID is required"
		return result
	}

	if secretKey == "" {
		result["message"] = "AWS Secret Access Key is required"
		return result
	}

	client := &http.Client{Timeout: 10 * time.Second}

	reqUrl := fmt.Sprintf("https://%s/v2/", req.Registry)
	httpReq, err := http.NewRequest("GET", reqUrl, nil)
	if err != nil {
		result["message"] = fmt.Sprintf("Failed to create request: %v", err)
		return result
	}

	auth := base64.StdEncoding.EncodeToString([]byte("AWS:" + accessKey + ":" + secretKey))
	httpReq.Header.Set("Authorization", "Basic "+auth)

	resp, err := client.Do(httpReq)
	if err != nil {
		result["message"] = fmt.Sprintf("Failed to connect to ECR: %v", err)
		return result
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		result["message"] = "Invalid AWS credentials"
		return result
	}

	if resp.StatusCode == 200 || resp.StatusCode == 403 {
		result["success"] = true
		result["message"] = "AWS credentials verified"
		return result
	}

	result["message"] = fmt.Sprintf("ECR returned status %d", resp.StatusCode)
	return result
}

func (h *Handler) testGarAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	token := req.Token

	if token == "" {
		result["message"] = "Google Artifact Registry token is required"
		return result
	}

	client := &http.Client{Timeout: 10 * time.Second}

	reqUrl := fmt.Sprintf("https://%s/v2/", req.Registry)
	httpReq, err := http.NewRequest("GET", reqUrl, nil)
	if err != nil {
		result["message"] = fmt.Sprintf("Failed to create request: %v", err)
		return result
	}

	httpReq.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(httpReq)
	if err != nil {
		result["message"] = fmt.Sprintf("Failed to connect to Google Artifact Registry: %v", err)
		return result
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		result["message"] = "Invalid token"
		return result
	}

	if resp.StatusCode == 200 || resp.StatusCode == 403 {
		result["success"] = true
		result["message"] = "Token verified"
		return result
	}

	result["message"] = fmt.Sprintf("Google Artifact Registry returned status %d", resp.StatusCode)
	return result
}

func (h *Handler) testHarborAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	url := req.URL
	username := req.Username
	password := req.Password

	if url == "" {
		result["message"] = "Harbor URL is required"
		return result
	}

	if username == "" {
		result["message"] = "Harbor username is required"
		return result
	}

	if password == "" {
		result["message"] = "Harbor password is required"
		return result
	}

	if !strings.HasPrefix(url, "http") {
		url = "https://" + url
	}

	registryUrl := fmt.Sprintf("%s/v2/", url)
	verified := h.verifyDockerRegistryV2Auth(registryUrl, username, password)

	if !verified {
		result["message"] = "Authentication failed - check URL and credentials"
		return result
	}

	result["success"] = true
	result["message"] = fmt.Sprintf("Authenticated to Harbor at %s", req.URL)
	return result
}

func (h *Handler) testTencentCloudAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	username := req.Username
	password := req.Password
	registry := req.Registry

	if username == "" {
		result["message"] = "Tencent Cloud Container Registry username is required"
		return result
	}

	if password == "" {
		result["message"] = "Tencent Cloud Container Registry password is required"
		return result
	}

	registryUrl := fmt.Sprintf("https://%s/v2/", registry)
	verified := h.verifyDockerRegistryV2Auth(registryUrl, username, password)

	if !verified {
		result["message"] = "Authentication failed"
		return result
	}

	result["success"] = true
	result["message"] = fmt.Sprintf("Authenticated to %s", registry)
	return result
}

func (h *Handler) testHuaweiCloudAuth(req TestTokenRequest) gin.H {
	result := gin.H{
		"registry": req.Registry,
		"success":  false,
		"message":  "",
	}

	username := req.Username
	password := req.Password
	registry := req.Registry

	if username == "" {
		result["message"] = "Huawei Cloud Container Registry username is required"
		return result
	}

	if password == "" {
		result["message"] = "Huawei Cloud Container Registry password is required"
		return result
	}

	registryUrl := fmt.Sprintf("https://%s/v2/", registry)
	verified := h.verifyDockerRegistryV2Auth(registryUrl, username, password)

	if !verified {
		result["message"] = "Authentication failed"
		return result
	}

	result["success"] = true
	result["message"] = fmt.Sprintf("Authenticated to %s", registry)
	return result
}