#!/bin/bash

set -e

# Set default port if not provided
PORT=${PORT:-9238}

# Record start time
SCRIPT_START=$(date +%s%3N)

clear

echo "🚀 启动后端服务..."
echo ""

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root directory
cd "$PROJECT_ROOT"

echo "📂 工作目录: $(pwd)"
echo ""

# Step 1: Check port
echo "⏱️  [1/5] 检查端口 $PORT..."
STEP_START=$(date +%s%3N)
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
STEP_END=$(date +%s%3N)
echo "   ✓ 端口检查完成 ($((STEP_END - STEP_START))ms)"
echo ""

# Step 2: Check/Build binary
echo "⏱️  [2/5] 检查编译状态..."
STEP_START=$(date +%s%3N)

BINARY_NAME="server_optimized"
BINARY_PATH="app/$BINARY_NAME"
NEED_BUILD=0

# Check if binary exists
if [ ! -f "$BINARY_PATH" ]; then
    echo "   ℹ️  二进制文件不存在，需要编译"
    NEED_BUILD=1
else
    # Check if source files are newer than binary
    if find app -name "*.go" -newer "$BINARY_PATH" | grep -q .; then
        echo "   ℹ️  源码已更新，需要重新编译"
        NEED_BUILD=1
    else
        echo "   ✓ 二进制文件已是最新"
    fi
fi

# Build if needed
if [ $NEED_BUILD -eq 1 ]; then
    echo ""
    echo "   🔨 正在编译..."
    BUILD_START=$(date +%s%3N)
    cd app
    go build -ldflags="-s -w" -o "$BINARY_NAME" cmd/server/main.go
    BUILD_END=$(date +%s%3N)
    echo "   ✓ 编译完成 ($((BUILD_END - BUILD_START))ms)"
    cd ..
fi

STEP_END=$(date +%s%3N)
echo "   ✓ 编译检查完成 (总耗时: $((STEP_END - STEP_START))ms)"
echo ""

# Step 3: Check dependencies (skip if binary exists)
if [ $NEED_BUILD -eq 1 ]; then
    echo "⏱️  [3/5] 检查依赖..."
    STEP_START=$(date +%s%3N)
    if [ ! -f "app/go.sum" ]; then
        echo "   📥 下载 Go 依赖..."
        cd app && go mod download && cd ..
    fi
    STEP_END=$(date +%s%3N)
    echo "   ✓ 依赖检查完成 ($((STEP_END - STEP_START))ms)"
else
    echo "⏱️  [3/5] 依赖检查... 跳过 (使用已编译二进制)"
fi
echo ""

# Calculate preparation time
PREP_END=$(date +%s%3N)
PREP_TIME=$((PREP_END - SCRIPT_START))

echo "✅ 启动准备完成，总耗时: ${PREP_TIME}ms"
echo ""
echo "🎯 启动服务 (端口: $PORT)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 4: Run the server with timing
STEP_START=$(date +%s%3N)
cd app && ./"$BINARY_NAME" 2>&1 &
SERVER_PID=$!
cd ..

# Wait for server to start (check if port is listening)
for i in {1..30}; do
    if netstat -ano 2>/dev/null | grep ":$PORT " | grep -q "LISTENING"; then
        break
    fi
    if lsof -i ":$PORT" 2>/dev/null | grep -q LISTEN; then
        break
    fi
    sleep 0.1
done

STEP_END=$(date +%s%3N)
SERVER_START_TIME=$((STEP_END - STEP_START))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Final timing
SCRIPT_END=$(date +%s%3N)
TOTAL_TIME=$((SCRIPT_END - SCRIPT_START))

echo "🎉 服务启动完成!"
echo ""
echo "📊 启动时间统计:"
echo "   • 脚本准备: ${PREP_TIME}ms"
echo "   • 服务启动: ${SERVER_START_TIME}ms"
echo "   • 总耗时:   ${TOTAL_TIME}ms"
echo ""
echo "📝 服务信息:"
echo "   • PID: $SERVER_PID"
echo "   • 端口: $PORT"
echo "   • 地址: http://127.0.0.1:$PORT"
echo ""
echo "💡 默认账号: admin / 123456"
echo ""

# Keep script running and show logs
wait $SERVER_PID
