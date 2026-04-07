#!/bin/bash

set -e

clear

echo "🚀 启动后端服务..."

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

if [ ! -d "vendor" ] && [ ! -f "go.sum" ]; then
    echo "📥 下载 Go 依赖..."
    go mod download
    go mod tidy
else
    echo "✅ 依赖已下载"
fi

echo "🔧 启动后端服务 (端口: $PORT)..."
go run cmd/server/main.go