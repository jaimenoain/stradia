export interface Market {
  id: string
  org_id: string
  name: string
  region_code: string | null
  currency: string | null
}

export interface Template {
  id: string
  owner_org_id: string | null
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface TemplateVersion {
  id: string
  template_id: string
  version_string: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  changelog: string | null
  created_at: string
  updated_at: string
}

export interface TemplateTask {
  id: string
  template_version_id: string
  title: string
  description: string | null
  task_type: 'A' | 'B' | 'C'
  weight: number
  is_optional: boolean
  task_config: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MarketBoardTask {
  id: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED' | 'GHOST' | string
  is_ghost: boolean
  title: string
  description: string | null
  task_type: 'A' | 'B' | 'C'
  origin_template_task_id: string | null
  weight: number
  is_optional: boolean
  task_config: Record<string, any>
}
