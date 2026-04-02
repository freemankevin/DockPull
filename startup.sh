#!/bin/bash

set -e

echo "🚀 启动前端开发服务器..."
echo "📦 检查依赖..."

if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm install
else
    echo "✅ 依赖已安装"
fi

echo "🔧 启动开发服务器 (端口: 8212)..."
npm run dev -- --port 8212
