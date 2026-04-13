export function detectRegistry(imageName: string): string {
  const parts = imageName.split('/')
  
  if (parts.length === 1) {
    return 'docker.io'
  }
  
  if (parts.length >= 2) {
    const firstPart = parts[0]
    if (firstPart.includes('.') || firstPart === 'localhost') {
      return firstPart
    }
    return 'docker.io'
  }
  
  return 'docker.io'
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