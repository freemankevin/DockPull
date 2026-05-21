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

export interface HarborConfig {
  id: string
  url: string
  username: string
  password: string
  cert: string
  verified: boolean
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
  container_runtime: string
  docker_host: string
  docker_host_timeout: number
  ghcr_token: string
  ghcr_username: string
  dockerhub_username: string
  dockerhub_token: string
  quay_username: string
  quay_password: string
  acr_username: string
  acr_password: string
  ecr_access_key_id: string
  ecr_secret_access_key: string
  ecr_region: string
  gar_token: string
  harbor_url: string
  harbor_username: string
  harbor_password: string
  harbor_tls_cert: string
  harbor_configs: HarborConfig[]
  tencentcloud_username: string
  tencentcloud_password: string
  huaweicloud_username: string
  huaweicloud_password: string
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
  platform: string
}

export interface BuildTask {
  id: string
  repo_tags: string[]
  size: number
  created_at: number
  repository: string
  tag: string
  platform: string
}

export interface BuildRequest {
  dockerfile_path: string
  tag: string
  build_args?: Record<string, string>
}

export interface ComposeProject {
  name: string
  path: string
  status: string
  services: ComposeService[]
}

export interface ComposeService {
  name: string
  image: string
  status: string
  state: string
  ports: string
}

export interface Container {
  id: string
  names: string[]
  image: string
  command: string
  created: number
  status: string
  state: string
  ports: ContainerPort[]
  labels: Record<string, string>
  size_rw: number
  size_root_fs: number
}

export interface ContainerPort {
  ip: string
  private_port: number
  public_port: number
  type: string
}
