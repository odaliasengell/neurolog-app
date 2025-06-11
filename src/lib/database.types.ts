// src/lib/database.types.ts
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'parent' | 'teacher' | 'specialist'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'parent' | 'teacher' | 'specialist'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'parent' | 'teacher' | 'specialist'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      children: {
        Row: {
          id: string
          name: string
          birth_date: string | null
          diagnosis: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          birth_date?: string | null
          diagnosis?: string | null
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          birth_date?: string | null
          diagnosis?: string | null
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_child_relations: {
        Row: {
          id: string
          user_id: string
          child_id: string
          relationship_type: 'parent' | 'teacher' | 'specialist' | 'observer'
          can_edit: boolean
          can_view: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          child_id: string
          relationship_type: 'parent' | 'teacher' | 'specialist' | 'observer'
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          child_id?: string
          relationship_type?: 'parent' | 'teacher' | 'specialist' | 'observer'
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          icon: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string
          icon?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          icon?: string
          created_at?: string
        }
      }
      daily_logs: {
        Row: {
          id: string
          child_id: string
          category_id: string | null
          title: string
          content: string
          mood_score: number | null
          intensity_level: 'low' | 'medium' | 'high'
          logged_by: string
          log_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          category_id?: string | null
          title: string
          content: string
          mood_score?: number | null
          intensity_level?: 'low' | 'medium' | 'high'
          logged_by: string
          log_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          category_id?: string | null
          title?: string
          content?: string
          mood_score?: number | null
          intensity_level?: 'low' | 'medium' | 'high'
          logged_by?: string
          log_date?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}