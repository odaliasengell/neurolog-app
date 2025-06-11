import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos TypeScript para la base de datos
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