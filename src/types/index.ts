export interface Image {
  id: number
  name: string
  tag: string
  full_name: string
  platform: string
  status: 'pending' | 'pulling' | 'success' | 'failed'
  retry_count: number
  error_message: string
  export_path: string
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
  database_path: string
  export_path: string
  retry_max_attempts: number
  retry_interval_sec: number
  enable_webhook: boolean
  webhook_url: string
  webhook_type: 'dingtalk' | 'feishu' | 'wechat'
  concurrent_pulls: number
  default_platform: string
  gzip_compression: number
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
