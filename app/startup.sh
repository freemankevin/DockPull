#!/bin/bash

set -e

echo "🚀 启动后端服务..."
echo "📦 检查依赖..."

if [ ! -d "vendor" ] && [ ! -f "go.sum" ]; then
    echo "📥 下载 Go 依赖..."
    go mod download
    go mod tidy
else
    echo "✅ 依赖已下载"
fi

echo "🔧 启动后端服务 (端口: 9238)..."
go run cmd/server/main.go
