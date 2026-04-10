-- Docker Pull Manager Database Initialization Script
-- This script creates all necessary tables and indexes

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Images table for storing image pull tasks
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT 'latest',
    full_name TEXT NOT NULL,
    platform TEXT DEFAULT 'linux/amd64',
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    export_path TEXT,
    exported_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_auto_export BOOLEAN DEFAULT 0
);

-- Image logs table for tracking actions
CREATE TABLE IF NOT EXISTS image_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);

-- Settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    export_path TEXT,  -- Will be set to root exports dir on first run
    retry_max_attempts INTEGER DEFAULT 0,
    retry_interval_sec INTEGER DEFAULT 30,
    enable_webhook BOOLEAN DEFAULT 0,
    webhook_url TEXT DEFAULT '',
    webhook_type TEXT DEFAULT 'dingtalk',
    concurrent_pulls INTEGER DEFAULT 3,
    default_platform TEXT DEFAULT 'linux/amd64,linux/arm64',
    gzip_compression INTEGER DEFAULT 9,
    ghcr_token TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_full_name ON images(full_name);
CREATE INDEX IF NOT EXISTS idx_logs_image_id ON image_logs(image_id);

-- Insert default settings
INSERT OR IGNORE INTO settings (id) VALUES (1);
