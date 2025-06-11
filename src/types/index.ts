// src/types/index.ts
export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'parent' | 'teacher' | 'specialist'
  avatar_url?: string | null
  phone?: string | null
  is_active: boolean
  last_login?: string | null
  created_at: string
  updated_at: string
}

export interface Child {
  id: string
  name: string
  birth_date?: string | null
  diagnosis?: string | null
  notes?: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChildWithRelation extends Child {
  relationship_type: 'parent' | 'teacher' | 'specialist' | 'observer'
  can_edit: boolean
  can_view: boolean
  can_export: boolean
}

export interface DailyLog {
  id: string
  child_id: string
  category_id?: string | null
  title: string
  content: string
  mood_score?: number | null
  intensity_level: 'low' | 'medium' | 'high'
  logged_by: string
  log_date: string
  is_private: boolean
  attachments: any[]
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description?: string | null
  color: string
  icon: string
  is_active: boolean
  sort_order: number
  created_at: string
}