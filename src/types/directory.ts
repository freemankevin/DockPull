export interface Directory {
  name: string
  path: string
  isDir: boolean
  modTime?: string
}

export interface SpecialDir {
  name: string
  path: string
  icon: string
}

export interface Breadcrumb {
  name: string
  path: string
}

export interface BrowseResponse {
  current: string
  parent: string
  dirs: Directory[]
  specials?: SpecialDir[]
  breadcrumbs?: Breadcrumb[]
}