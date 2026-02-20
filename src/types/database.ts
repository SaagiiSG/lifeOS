// Supabase Database Types
// This file will be auto-generated from Supabase schema later
// For now, we define placeholder types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      canvas: {
        Row: {
          id: string
          user_id: string | null
          name: string
          document: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name?: string
          document?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          document?: Json
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string | null
          canvas_id: string | null
          shape_id: string
          title: string
          description: string | null
          target_date: string | null
          progress: number
          status: 'active' | 'completed' | 'archived'
          milestones: Json
          check_ins: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          canvas_id?: string | null
          shape_id: string
          title: string
          description?: string | null
          target_date?: string | null
          progress?: number
          status?: 'active' | 'completed' | 'archived'
          milestones?: Json
          check_ins?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          canvas_id?: string | null
          shape_id?: string
          title?: string
          description?: string | null
          target_date?: string | null
          progress?: number
          status?: 'active' | 'completed' | 'archived'
          milestones?: Json
          check_ins?: Json
          created_at?: string
          updated_at?: string
        }
      }
      habits: {
        Row: {
          id: string
          user_id: string | null
          canvas_id: string | null
          shape_id: string
          name: string
          color: string
          check_ins: Json
          current_streak: number
          longest_streak: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          canvas_id?: string | null
          shape_id: string
          name: string
          color?: string
          check_ins?: Json
          current_streak?: number
          longest_streak?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          canvas_id?: string | null
          shape_id?: string
          name?: string
          color?: string
          check_ins?: Json
          current_streak?: number
          longest_streak?: number
          created_at?: string
          updated_at?: string
        }
      }
      video_projects: {
        Row: {
          id: string
          user_id: string | null
          canvas_id: string | null
          shape_id: string
          title: string
          status: 'uploaded' | 'processing' | 'completed' | 'failed'
          source_url: string | null
          output_url: string | null
          thumbnail_url: string | null
          duration: number | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          canvas_id?: string | null
          shape_id: string
          title: string
          status?: 'uploaded' | 'processing' | 'completed' | 'failed'
          source_url?: string | null
          output_url?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          canvas_id?: string | null
          shape_id?: string
          title?: string
          status?: 'uploaded' | 'processing' | 'completed' | 'failed'
          source_url?: string | null
          output_url?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      broll_clips: {
        Row: {
          id: string
          user_id: string | null
          file_path: string
          category: 'timelapse' | 'medium' | 'wide-shot' | 'close-up' | 'random' | 'walking-selfie'
          duration: number | null
          thumbnail_url: string | null
          keywords: string[] | null
          filename: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          file_path: string
          category?: 'timelapse' | 'medium' | 'wide-shot' | 'close-up' | 'random' | 'walking-selfie'
          duration?: number | null
          thumbnail_url?: string | null
          keywords?: string[] | null
          filename?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          file_path?: string
          category?: 'timelapse' | 'medium' | 'wide-shot' | 'close-up' | 'random' | 'walking-selfie'
          duration?: number | null
          thumbnail_url?: string | null
          keywords?: string[] | null
          filename?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
