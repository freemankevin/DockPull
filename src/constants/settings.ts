export type TabId = 'account' | 'export' | 'webhook' | 'tokens'

export const TAB_LABEL_KEYS: Record<TabId, string> = {
  account: 'settings.tab.account',
  export: 'settings.tab.export',
  tokens: 'settings.tab.tokens',
  webhook: 'settings.tab.webhook',
}

export const TAB_TITLE_KEYS: Record<TabId, { title: string; subtitle: string }> = {
  account: { title: 'settings.account.title', subtitle: 'settings.account.subtitle' },
  export: { title: 'settings.export.title', subtitle: 'settings.export.subtitle' },
  tokens: { title: 'settings.tokens.title', subtitle: 'settings.tokens.subtitle' },
  webhook: { title: 'settings.webhook.title', subtitle: 'settings.webhook.subtitle' },
}

export type TokenRegistryId = 'dockerhub' | 'ghcr' | 'quay' | 'acr' | 'ecr' | 'gar' | 'harbor' | 'tencentcloud' | 'huaweicloud'

export type TokenRegistryField = {
  key: string
  placeholder: string
  type: 'text' | 'password'
}

export type TokenRegistryConfig = {
  id: TokenRegistryId
  name: string
  hint: string
  fields: TokenRegistryField[]
  checkKeys: string[]
  hasCert?: boolean
  requireTest?: boolean
}

export const TOKEN_REGISTRY_CONFIG_KEYS: Record<TokenRegistryId, TokenRegistryId> = {
  dockerhub: 'dockerhub',
  ghcr: 'ghcr',
  quay: 'quay',
  acr: 'acr',
  ecr: 'ecr',
  gar: 'gar',
  harbor: 'harbor',
  tencentcloud: 'tencentcloud',
  huaweicloud: 'huaweicloud',
}

export const TOKEN_REGISTRY_CONFIG: Record<TokenRegistryId, TokenRegistryConfig> = {
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
    hint: 'Personal access token with read:packages scope. Both username and token are required. Token must belong to the specified GitHub user.',
    fields: [
      { key: 'ghcr_username', placeholder: 'GitHub Username', type: 'text' },
      { key: 'ghcr_token', placeholder: 'ghp_xxxxxxxxxxxx', type: 'password' },
    ],
    checkKeys: ['ghcr_username', 'ghcr_token'],
    requireTest: true,
  },
  quay: {
    id: 'quay',
    name: 'Quay.io',
    hint: 'Red Hat account credentials for Quay.io registry. Use your Red Hat login (username + password). Optional for public images.',
    fields: [
      { key: 'quay_username', placeholder: 'Red Hat Username', type: 'text' },
      { key: 'quay_password', placeholder: 'Red Hat Password', type: 'password' },
    ],
    checkKeys: ['quay_username', 'quay_password'],
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
  harbor: {
    id: 'harbor',
    name: 'Harbor',
    hint: 'Private Harbor registry. URL, username, password required. TLS certificate optional for self-signed certs.',
    fields: [
      { key: 'harbor_url', placeholder: 'https://harbor.example.com', type: 'text' },
      { key: 'harbor_username', placeholder: 'Username', type: 'text' },
      { key: 'harbor_password', placeholder: 'Password', type: 'password' },
    ],
    checkKeys: ['harbor_url', 'harbor_username', 'harbor_password'],
    hasCert: true,
  },
  tencentcloud: {
    id: 'tencentcloud',
    name: 'Tencent Cloud Container Registry (tcr)',
    hint: 'Username and password for Tencent Cloud Container Registry (ccr.ccs.tencentyun.com).',
    fields: [
      { key: 'tencentcloud_username', placeholder: 'Username', type: 'text' },
      { key: 'tencentcloud_password', placeholder: 'Password', type: 'password' },
    ],
    checkKeys: ['tencentcloud_username', 'tencentcloud_password'],
  },
  huaweicloud: {
    id: 'huaweicloud',
    name: 'Huawei Cloud Container Registry (swr)',
    hint: 'Username and password for Huawei Cloud Software Repository for Container (swr.cn-north-4.myhuaweicloud.com).',
    fields: [
      { key: 'huaweicloud_username', placeholder: 'Username', type: 'text' },
      { key: 'huaweicloud_password', placeholder: 'Password', type: 'password' },
    ],
    checkKeys: ['huaweicloud_username', 'huaweicloud_password'],
  },
}