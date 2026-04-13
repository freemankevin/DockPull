export type TabId = 'account' | 'export' | 'webhook' | 'tokens'

export const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account',  icon: null },
  { id: 'export', label: 'Export',   icon: null },
  { id: 'tokens',  label: 'Tokens',   icon: null },
  { id: 'webhook', label: 'Webhook',  icon: null },
]

export const TAB_TITLES: Record<TabId, { title: string; subtitle: string }> = {
  account: { title: 'Account Settings', subtitle: 'Manage your account credentials and password.' },
  export: { title: 'Export Settings', subtitle: 'Configure export path, platform, and pull behavior.' },
  tokens: { title: 'Access Tokens', subtitle: 'Configure authentication tokens for container registries.' },
  webhook: { title: 'Webhook Notifications', subtitle: 'Configure notifications for pull completion and failures.' },
}

export const TOKEN_REGISTRY_CONFIG = {
  dockerhub: {
    id: 'dockerhub',
    name: 'Docker Hub',
    hint: 'Username and access token for Docker Hub (hub.docker.com). Create token at Account Settings > Security.',
    fields: [
      { key: 'dockerhub_username', placeholder: 'Username', type: 'text' },
      { key: 'dockerhub_token', placeholder: 'Access token', type: 'password' },
    ],
    checkKeys: ['dockerhub_username', 'dockerhub_token'],
  },
  ghcr: {
    id: 'ghcr',
    name: 'GitHub Container Registry (ghcr.io)',
    hint: 'Personal access token with read:packages scope. Required even for public images.',
    fields: [
      { key: 'ghcr_token', placeholder: 'ghp_xxxxxxxxxxxx', type: 'password' },
    ],
    checkKeys: ['ghcr_token'],
  },
  quay: {
    id: 'quay',
    name: 'Quay.io',
    hint: 'Access token for Quay.io registry. Create robot account or use OAuth token.',
    fields: [
      { key: 'quay_token', placeholder: 'Quay access token', type: 'password' },
    ],
    checkKeys: ['quay_token'],
  },
  acr: {
    id: 'acr',
    name: 'Alibaba Container Registry (acr)',
    hint: 'Username and password for Alibaba Cloud Container Registry (cr.aliyun.com).',
    fields: [
      { key: 'acr_username', placeholder: 'Username', type: 'text' },
      { key: 'acr_password', placeholder: 'Password', type: 'password' },
    ],
    checkKeys: ['acr_username', 'acr_password'],
  },
  ecr: {
    id: 'ecr',
    name: 'AWS ECR',
    hint: 'AWS credentials for Elastic Container Registry. Region defaults to us-east-1.',
    fields: [
      { key: 'ecr_access_key_id', placeholder: 'Access Key ID', type: 'password' },
      { key: 'ecr_secret_access_key', placeholder: 'Secret Access Key', type: 'password' },
      { key: 'ecr_region', placeholder: 'Region (e.g., us-east-1)', type: 'text' },
    ],
    checkKeys: ['ecr_access_key_id', 'ecr_secret_access_key'],
  },
  gar: {
    id: 'gar',
    name: 'Google Artifact Registry (gar)',
    hint: 'Service account JSON key or OAuth token for Google Artifact Registry.',
    fields: [
      { key: 'gar_token', placeholder: 'Google Cloud token or JSON key', type: 'password' },
    ],
    checkKeys: ['gar_token'],
  },
}