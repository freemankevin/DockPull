export function detectRegistry(imageName: string): string {
  const knownPublicRegistries = [
    'docker.io',
    'ghcr.io',
    'quay.io',
    'gcr.io',
    'registry.k8s.io',
    'k8s.gcr.io',
  ]
  
  const cloudRegistryPatterns: Record<string, string> = {
    'aliyuncs.com': 'acr.aliyuncs.com',
    'ecr.aws': 'ecr.aws',
    'amazonaws.com': 'ecr.aws',
    'pkg.dev': 'gar.googleapis.com',
    'tencentyun.com': 'tencentcloud',
    'ccr.ccs': 'tencentcloud',
    'myhuaweicloud.com': 'huaweicloud',
    'huawei.com': 'huaweicloud',
  }
  
  const parts = imageName.split('/')
  
  if (parts.length === 1) {
    return 'docker.io'
  }
  
  if (parts.length >= 2) {
    const firstPart = parts[0]
    
    if (knownPublicRegistries.includes(firstPart)) {
      return firstPart
    }
    
    for (const [pattern, registry] of Object.entries(cloudRegistryPatterns)) {
      if (firstPart.includes(pattern)) {
        return registry
      }
    }
    
    if (firstPart.includes('.') || firstPart === 'localhost') {
      return 'harbor'
    }
    
    return 'docker.io'
  }
  
  return 'harbor'
}

export function getShortName(imageName: string): string {
  const parts = imageName.split('/')
  return parts[parts.length - 1]
}

export function parseImageName(fullName: string) {
  const parts = fullName.split(':')
  const name = parts[0].trim()
  const tag = parts[1]?.trim() || 'latest'
  return { name, tag }
}