# Docker Pull Manager

一个用于管理本地 Docker 镜像拉取和导出的 Web 应用。

## 功能特性

- 自动拉取镜像，支持无限重试
- 批量下载镜像和单个镜像下载
- 支持多架构镜像（linux/amd64, linux/arm64 等）
- 自动离线导出到本地，使用 gzip 压缩
- 钉钉、飞书、企业微信 Webhook 通知支持
- 支持 Windows/Mac/Linux 三大系统

## 技术栈

- 前端：React + TypeScript + Vite
- 后端：Go + Gin + SQLite
- 图标：Lucide React

## 快速开始

### 开发模式

1. 启动后端服务：
```bash
cd app
go mod download
go run cmd/server/main.go
```

2. 启动前端开发服务器：
```bash
npm install
npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
docker-compose up -d
```

访问 http://localhost

## 目录结构

```
.
├── app/              # Go 后端
│   ├── cmd/server/   # 主程序入口
│   ├── internal/     # 内部包
│   │   ├── config/   # 配置管理
│   │   ├── database/ # 数据库操作
│   │   ├── handler/  # HTTP 处理器
│   │   ├── models/   # 数据模型
│   │   └── service/  # 业务逻辑
│   └── go.mod
├── src/              # React 前端
│   ├── api/          # API 接口
│   ├── components/   # 组件
│   ├── hooks/        # 自定义 Hooks
│   ├── pages/        # 页面
│   └── types/        # TypeScript 类型
├── config/           # 配置文件
├── data/             # SQLite 数据库
├── exports/          # 导出文件
├── docker-compose.yml
└── package.json
```

## API 文档

### 镜像管理

- `GET /api/images` - 获取镜像列表
- `POST /api/images` - 创建镜像
- `DELETE /api/images/:id` - 删除镜像
- `POST /api/images/:id/pull` - 拉取镜像
- `POST /api/images/:id/export` - 导出镜像
- `GET /api/images/:id/logs` - 获取镜像日志

### 配置管理

- `GET /api/config` - 获取配置
- `PUT /api/config` - 更新配置

### Webhook

- `POST /api/webhook/test` - 测试 Webhook

### 统计

- `GET /api/stats` - 获取统计数据
