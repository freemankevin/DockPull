# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# Stage 2: Build backend
FROM golang:1.23-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY app/go.mod app/go.sum ./
RUN go mod download
COPY app/ .
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server

# Stage 3: Runtime
FROM alpine:latest

RUN apk add --no-cache ca-certificates sqlite-libs sqlite-dev curl

WORKDIR /app

COPY --from=backend-builder /app/server .
COPY --from=frontend-builder /app/dist ./dist

RUN mkdir -p data exports config

EXPOSE 9238

ENV SERVER_HOST=0.0.0.0

CMD ["./server"]