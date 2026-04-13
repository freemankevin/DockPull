package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/gin-gonic/gin"
)

func toUnixPath(p string) string {
	p = strings.ReplaceAll(p, "\\", "/")
	if len(p) >= 2 && p[1] == ':' {
		drive := strings.ToLower(string(p[0]))
		p = "/" + drive + p[2:]
	}
	return p
}

func fromUnixPath(p string) string {
	if runtime.GOOS != "windows" {
		return p
	}
	if len(p) >= 3 && p[0] == '/' && p[2] == '/' {
		drive := strings.ToUpper(string(p[1]))
		p = drive + ":" + p[2:]
	} else if len(p) == 2 && p[0] == '/' {
		drive := strings.ToUpper(string(p[1]))
		p = drive + ":"
	}
	return strings.ReplaceAll(p, "/", "\\")
}

func getSpecialDirs() []map[string]interface{} {
	var specials []map[string]interface{}

	home, err := os.UserHomeDir()
	if err == nil && home != "" {
		specials = append(specials, map[string]interface{}{
			"name": "Home",
			"path": toUnixPath(home),
			"icon": "home",
		})
	}

	desktop := filepath.Join(home, "Desktop")
	if runtime.GOOS == "windows" {
		if _, err := os.Stat(desktop); err != nil {
			desktop = filepath.Join(home, "桌面")
		}
	}
	if _, err := os.Stat(desktop); err == nil {
		specials = append(specials, map[string]interface{}{
			"name": "Desktop",
			"path": toUnixPath(desktop),
			"icon": "desktop",
		})
	}

	docs := filepath.Join(home, "Documents")
	if runtime.GOOS == "windows" {
		if _, err := os.Stat(docs); err != nil {
			docs = filepath.Join(home, "文档")
		}
	}
	if _, err := os.Stat(docs); err == nil {
		specials = append(specials, map[string]interface{}{
			"name": "Documents",
			"path": toUnixPath(docs),
			"icon": "documents",
		})
	}

	downloads := filepath.Join(home, "Downloads")
	if runtime.GOOS == "windows" {
		if _, err := os.Stat(downloads); err != nil {
			downloads = filepath.Join(home, "下载")
		}
	}
	if _, err := os.Stat(downloads); err == nil {
		specials = append(specials, map[string]interface{}{
			"name": "Downloads",
			"path": toUnixPath(downloads),
			"icon": "downloads",
		})
	}

	if runtime.GOOS != "windows" {
		specials = append(specials, map[string]interface{}{
			"name": "Root",
			"path": "/",
			"icon": "root",
		})
	}

	return specials
}

func (h *Handler) BrowseDirectory(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		path = "."
	}

	localPath := fromUnixPath(path)
	absPath, err := filepath.Abs(localPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}

	entries, err := os.ReadDir(absPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var dirs []map[string]interface{}
	for _, entry := range entries {
		if entry.IsDir() {
			info, err := entry.Info()
			modTime := ""
			if err == nil {
				modTime = info.ModTime().Format("2006-01-02 15:04")
			}
			dirs = append(dirs, map[string]interface{}{
				"name":    entry.Name(),
				"path":    filepath.Join(absPath, entry.Name()),
				"isDir":   true,
				"modTime": modTime,
			})
		}
	}

	parent := ""
	if absPath != "/" && !strings.HasSuffix(absPath, ":\\") {
		parent = filepath.Dir(absPath)
	}

	breadcrumbs := []map[string]string{}
	parts := strings.Split(absPath, string(filepath.Separator))
	currentPath := ""
	for i, part := range parts {
		if part == "" {
			continue
		}
		if runtime.GOOS == "windows" && i == 0 && strings.HasSuffix(part, ":") {
			currentPath = "/" + strings.ToLower(strings.TrimSuffix(part, ":"))
			breadcrumbs = append(breadcrumbs, map[string]string{
				"name": currentPath,
				"path": currentPath,
			})
		} else {
			currentPath = currentPath + "/" + part
			breadcrumbs = append(breadcrumbs, map[string]string{
				"name": part,
				"path": currentPath,
			})
		}
	}

	for i := range dirs {
		dirs[i]["path"] = toUnixPath(dirs[i]["path"].(string))
	}

	c.JSON(http.StatusOK, gin.H{
		"current":     toUnixPath(absPath),
		"parent":      toUnixPath(parent),
		"dirs":        dirs,
		"specials":    getSpecialDirs(),
		"breadcrumbs": breadcrumbs,
	})
}
