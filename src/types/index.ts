export interface Image {
  id: number
  name: string
  tag: string
  full_name: string
  platform: string
  status: 'pending' | 'pulling' | 'success' | 'failed'
  retry_count: number
  error_message: string | null
  export_path: string | null
  exported_at: string | null
  created_at: string
  updated_at: string
  is_auto_export: boolean
}

export interface ImageLog {
  id: number
  image_id: number
  action: string
  message: string
  created_at: string
}

export interface Config {
  export_path: string
  retry_max_attempts: number
  retry_interval_sec: number
  enable_webhook: boolean
  webhook_url: string
  webhook_type: 'dingtalk' | 'feishu' | 'wechat' | 'slack' | 'discord' | 'telegram' | 'teams' | 'line' | 'custom'
  concurrent_pulls: number
  default_platform: string
  gzip_compression: number
  ghcr_token: string
  dockerhub_username: string
  dockerhub_token: string
  quay_token: string
  acr_username: string
  acr_password: string
  ecr_access_key_id: string
  ecr_secret_access_key: string
  ecr_region: string
  gar_token: string
}

export interface CreateImageRequest {
  name: string
  tag?: string
  platform?: string
  is_auto_export?: boolean
}

export interface Stats {
  total: number
  success: number
  failed: number
  pending: number
}

export interface LocalImage {
  id: string
  repo_tags: string[]
  size: number
  created_at: number
  repository: string
  tag: string
  architecture: string
}
