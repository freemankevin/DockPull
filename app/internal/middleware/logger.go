package middleware

import (
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorPurple = "\033[35m"
	colorCyan   = "\033[36m"
	colorGray   = "\033[90m"
	colorWhite  = "\033[37m"
)

func statusColor(status int) string {
	switch {
	case status >= 200 && status < 300:
		return colorGreen
	case status >= 300 && status < 400:
		return colorCyan
	case status >= 400 && status < 500:
		return colorYellow
	case status >= 500:
		return colorRed
	default:
		return colorWhite
	}
}

func methodColor(method string) string {
	switch method {
	case "GET":
		return colorBlue
	case "POST":
		return colorCyan
	case "PUT":
		return colorYellow
	case "DELETE":
		return colorRed
	case "PATCH":
		return colorPurple
	default:
		return colorGray
	}
}

func levelColor(level string) string {
	switch level {
	case "INFO":
		return colorCyan
	case "WARN":
		return colorYellow
	case "ERROR":
		return colorRed
	case "DEBUG":
		return colorGray
	default:
		return colorWhite
	}
}

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method
		query := c.Request.URL.Query()
		if len(query) > 0 {
			path = path + "?" + query.Encode()
		}

		c.Next()

		end := time.Now()
		latency := end.Sub(start)
		status := c.Writer.Status()

		timestamp := start.Format("2006-01-02 15:04:05")

		level := "INFO"
		if status >= 400 && status < 500 {
			level = "WARN"
		} else if status >= 500 {
			level = "ERROR"
		}

		statusStr := fmt.Sprintf("%s%3d%s", statusColor(status), status, colorReset)
		methodStr := fmt.Sprintf("%-7s", method)
		methodColored := fmt.Sprintf("%s%s%s", methodColor(method), methodStr, colorReset)
		latencyStr := formatLatency(latency)
		levelStr := fmt.Sprintf("%s[%-5s]%s", levelColor(level), level, colorReset)

		pathDisplay := path
		if len(pathDisplay) > 60 {
			pathDisplay = pathDisplay[:57] + "..."
		}

		pathColored := strings.Replace(pathDisplay, "/api", fmt.Sprintf("%s/api%s", colorCyan, colorReset), 1)

		fmt.Printf("%s %s %s %s %s %s\n",
			timestamp,
			levelStr,
			methodColored,
			pathColored,
			statusStr,
			latencyStr,
		)
	}
}

func formatLatency(latency time.Duration) string {
	if latency < 1*time.Millisecond {
		return fmt.Sprintf("%s%7.2fµs%s", colorGray, float64(latency.Nanoseconds())/1000, colorReset)
	} else if latency < 100*time.Millisecond {
		return fmt.Sprintf("%s%7.2fms%s", colorGreen, float64(latency.Nanoseconds())/1000000, colorReset)
	} else if latency < 1*time.Second {
		return fmt.Sprintf("%s%7.2fms%s", colorYellow, float64(latency.Nanoseconds())/1000000, colorReset)
	} else {
		return fmt.Sprintf("%s%7.2fs%s", colorRed, latency.Seconds(), colorReset)
	}
}
