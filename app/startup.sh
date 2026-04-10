#!/bin/bash

set -e

# Set default port if not provided
PORT=${PORT:-9238}

clear

echo "🚀 启动后端服务..."

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root directory
cd "$PROJECT_ROOT"

echo "📂 工作目录: $(pwd)"

echo "🔍 检查端口 $PORT 是否被占用..."
if netstat -ano 2>/dev/null | grep ":$PORT " | grep -q "LISTENING"; then
    echo "⚠️  端口 $PORT 已被占用，正在处理..."
    PID=$(netstat -ano 2>/dev/null | grep ":$PORT " | grep "LISTENING" | awk '{print $NF}' | head -1)
    if [ -n "$PID" ]; then
        echo "🔪 杀掉进程 PID: $PID"
        taskkill //F //PID "$PID" 2>/dev/null || true
        sleep 1
    fi
elif lsof -i ":$PORT" 2>/dev/null | grep -q LISTEN; then
    echo "⚠️  端口 $PORT 已被占用，正在处理..."
    PID=$(lsof -t -i ":$PORT" 2>/dev/null | head -1)
    if [ -n "$PID" ]; then
        echo "🔪 杀掉进程 PID: $PID"
        kill -9 "$PID" 2>/dev/null || true
        sleep 1
    fi
fi

echo "✅ 端口 $PORT 可用"

echo "📦 检查依赖..."

if [ ! -d "app/vendor" ] && [ ! -f "app/go.sum" ]; then
    echo "📥 下载 Go 依赖..."
    cd app && go mod download && go mod tidy && cd ..
else
    echo "✅ 依赖已下载"
fi

echo "🔧 启动后端服务 (端口: $PORT)..."
cd app && go run cmd/server/main.go