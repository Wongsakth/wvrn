export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      artist_aliases: {
        Row: {
          alias: string
          artist_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          alias: string
          artist_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          alias?: string
          artist_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_aliases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_aliases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_active"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          bio: string | null
          created_at: string | null
          deleted_at: string | null
          facebook_url: string | null
          follower_count: number | null
          genres: string[] | null
          id: string
          image_url: string | null
          instagram_url: string | null
          label_id: string | null
          label_url: string | null
          last_scraped_at: string | null
          name: string
          name_en: string | null
          popularity: number | null
          scrape_enabled: boolean | null
          scrape_interval_days: number | null
          scrape_sources: Json | null
          slug: string | null
          spotify_id: string | null
          tiktok_url: string | null
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          deleted_at?: string | null
          facebook_url?: string | null
          follower_count?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          label_id?: string | null
          label_url?: string | null
          last_scraped_at?: string | null
          name: string
          name_en?: string | null
          popularity?: number | null
          scrape_enabled?: boolean | null
          scrape_interval_days?: number | null
          scrape_sources?: Json | null
          slug?: string | null
          spotify_id?: string | null
          tiktok_url?: string | null
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          deleted_at?: string | null
          facebook_url?: string | null
          follower_count?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          label_id?: string | null
          label_url?: string | null
          last_scraped_at?: string | null
          name?: string
          name_en?: string | null
          popularity?: number | null
          scrape_enabled?: boolean | null
          scrape_interval_days?: number | null
          scrape_sources?: Json | null
          slug?: string | null
          spotify_id?: string | null
          tiktok_url?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      artists_backup_20260511: {
        Row: {
          bio: string | null
          created_at: string | null
          facebook_url: string | null
          genres: string[] | null
          id: string | null
          image_url: string | null
          instagram_url: string | null
          label_id: string | null
          label_url: string | null
          name: string | null
          name_en: string | null
          tiktok_url: string | null
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          facebook_url?: string | null
          genres?: string[] | null
          id?: string | null
          image_url?: string | null
          instagram_url?: string | null
          label_id?: string | null
          label_url?: string | null
          name?: string | null
          name_en?: string | null
          tiktok_url?: string | null
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          facebook_url?: string | null
          genres?: string[] | null
          id?: string | null
          image_url?: string | null
          instagram_url?: string | null
          label_id?: string | null
          label_url?: string | null
          name?: string | null
          name_en?: string | null
          tiktok_url?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string | null
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_active"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_applications: {
        Row: {
          apply_type: string[] | null
          created_at: string | null
          id: string
          phone: string | null
          reason: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_url: string | null
          social_url: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          apply_type?: string[] | null
          created_at?: string | null
          id?: string
          phone?: string | null
          reason: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_url?: string | null
          social_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          apply_type?: string[] | null
          created_at?: string | null
          id?: string
          phone?: string | null
          reason?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_url?: string | null
          social_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_artists: {
        Row: {
          artist_id: string
          event_id: string
          is_headliner: boolean | null
          sort_order: number | null
          start_time: string | null
        }
        Insert: {
          artist_id: string
          event_id: string
          is_headliner?: boolean | null
          sort_order?: number | null
          start_time?: string | null
        }
        Update: {
          artist_id?: string
          event_id?: string
          is_headliner?: boolean | null
          sort_order?: number | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_active"
            referencedColumns: ["id"]
          },
        ]
      }
      event_artists_backup_20260511: {
        Row: {
          artist_id: string | null
          event_id: string | null
          is_headliner: boolean | null
          sort_order: number | null
          start_time: string | null
        }
        Insert: {
          artist_id?: string | null
          event_id?: string | null
          is_headliner?: boolean | null
          sort_order?: number | null
          start_time?: string | null
        }
        Update: {
          artist_id?: string | null
          event_id?: string | null
          is_headliner?: boolean | null
          sort_order?: number | null
          start_time?: string | null
        }
        Relationships: []
      }
      event_attendance: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_active"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_th: string | null
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_th?: string | null
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_th?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      event_interactions: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_interactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_active"
            referencedColumns: ["id"]
          },
        ]
      }
      event_lineup: {
        Row: {
          artist_id: string | null
          artist_name: string | null
          created_at: string | null
          end_time: string | null
          event_id: string
          id: string
          is_headliner: boolean | null
          lineup_date: string
          note: string | null
          sort_order: number | null
          stage: string | null
          start_time: string | null
        }
        Insert: {
          artist_id?: string | null
          artist_name?: string | null
          created_at?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          is_headliner?: boolean | null
          lineup_date: string
          note?: string | null
          sort_order?: number | null
          stage?: string | null
          start_time?: string | null
        }
        Update: {
          artist_id?: string | null
          artist_name?: string | null
          created_at?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          is_headliner?: boolean | null
          lineup_date?: string
          note?: string | null
          sort_order?: number | null
          stage?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_lineup_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_lineup_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_lineup_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_lineup_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_active"
            referencedColumns: ["id"]
          },
        ]
      }
      event_submissions: {
        Row: {
          ai_duplicate_check: Json | null
          artist_name: string
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          poster_url: string | null
          province: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          source: string | null
          source_url: string | null
          start_time: string | null
          status: string | null
          submitted_by: string | null
          ticket_price: string | null
          ticket_url: string | null
          title: string
          type: string | null
          venue_name: string
        }
        Insert: {
          ai_duplicate_check?: Json | null
          artist_name: string
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          poster_url?: string | null
          province: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          source?: string | null
          source_url?: string | null
          start_time?: string | null
          status?: string | null
          submitted_by?: string | null
          ticket_price?: string | null
          ticket_url?: string | null
          title: string
          type?: string | null
          venue_name: string
        }
        Update: {
          ai_duplicate_check?: Json | null
          artist_name?: string
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          poster_url?: string | null
          province?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          source?: string | null
          source_url?: string | null
          start_time?: string | null
          status?: string | null
          submitted_by?: string | null
          ticket_price?: string | null
          ticket_url?: string | null
          title?: string
          type?: string | null
          venue_name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attendance_count: number | null
          category_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_type: string | null
          featured_type: string | null
          genres: string[] | null
          id: string
          is_free: boolean | null
          is_multi_day: boolean | null
          lineup_count: number | null
          parent_event_id: string | null
          poster_url: string | null
          province: string
          slug: string | null
          start_date: string
          start_time: string | null
          status: string | null
          submitted_by: string | null
          ticket_announce_date: string | null
          ticket_price_max: number | null
          ticket_price_min: number | null
          ticket_sale_end: string | null
          ticket_sale_start: string | null
          ticket_url: string | null
          title: string
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_count?: number | null
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string | null
          featured_type?: string | null
          genres?: string[] | null
          id?: string
          is_free?: boolean | null
          is_multi_day?: boolean | null
          lineup_count?: number | null
          parent_event_id?: string | null
          poster_url?: string | null
          province: string
          slug?: string | null
          start_date: string
          start_time?: string | null
          status?: string | null
          submitted_by?: string | null
          ticket_announce_date?: string | null
          ticket_price_max?: number | null
          ticket_price_min?: number | null
          ticket_sale_end?: string | null
          ticket_sale_start?: string | null
          ticket_url?: string | null
          title: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_count?: number | null
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string | null
          featured_type?: string | null
          genres?: string[] | null
          id?: string
          is_free?: boolean | null
          is_multi_day?: boolean | null
          lineup_count?: number | null
          parent_event_id?: string | null
          poster_url?: string | null
          province?: string
          slug?: string | null
          start_date?: string
          start_time?: string | null
          status?: string | null
          submitted_by?: string | null
          ticket_announce_date?: string | null
          ticket_price_max?: number | null
          ticket_price_min?: number | null
          ticket_sale_end?: string | null
          ticket_sale_start?: string | null
          ticket_url?: string | null
          title?: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          artist_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_active"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          category: string
          color: string | null
          emoji: string | null
          id: string
          is_active: boolean | null
          label_en: string
          label_th: string
          name: string | null
          sort_order: number | null
        }
        Insert: {
          category: string
          color?: string | null
          emoji?: string | null
          id: string
          is_active?: boolean | null
          label_en: string
          label_th: string
          name?: string | null
          sort_order?: number | null
        }
        Update: {
          category?: string
          color?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          label_en?: string
          label_th?: string
          name?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      labels: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          name_en: string | null
          website_url: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          name_en?: string | null
          website_url?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          name_en?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      permission_matrix: {
        Row: {
          admin: boolean | null
          artist_manager: boolean | null
          category: string
          description: string | null
          editor: boolean | null
          id: string
          is_locked: boolean | null
          permission: string
          super_admin: boolean | null
          updated_at: string | null
          updated_by: string | null
          user: boolean | null
          venue_manager: boolean | null
        }
        Insert: {
          admin?: boolean | null
          artist_manager?: boolean | null
          category: string
          description?: string | null
          editor?: boolean | null
          id?: string
          is_locked?: boolean | null
          permission: string
          super_admin?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          user?: boolean | null
          venue_manager?: boolean | null
        }
        Update: {
          admin?: boolean | null
          artist_manager?: boolean | null
          category?: string
          description?: string | null
          editor?: boolean | null
          id?: string
          is_locked?: boolean | null
          permission?: string
          super_admin?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          user?: boolean | null
          venue_manager?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          artist_id: string | null
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          line_user_id: string | null
          notify_line: boolean | null
          role: string | null
          score: number | null
          score_rank: string | null
          theme: string | null
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          line_user_id?: string | null
          notify_line?: boolean | null
          role?: string | null
          score?: number | null
          score_rank?: string | null
          theme?: string | null
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          line_user_id?: string | null
          notify_line?: boolean | null
          role?: string | null
          score?: number | null
          score_rank?: string | null
          theme?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_active"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_logs: {
        Row: {
          artist_id: string | null
          artist_name: string | null
          created_at: string | null
          error_message: string | null
          events_added: number | null
          events_found: number | null
          events_skipped: number | null
          id: string
          source: string | null
          source_url: string | null
          status: string | null
        }
        Insert: {
          artist_id?: string | null
          artist_name?: string | null
          created_at?: string | null
          error_message?: string | null
          events_added?: number | null
          events_found?: number | null
          events_skipped?: number | null
          id?: string
          source?: string | null
          source_url?: string | null
          status?: string | null
        }
        Update: {
          artist_id?: string | null
          artist_name?: string | null
          created_at?: string | null
          error_message?: string | null
          events_added?: number | null
          events_found?: number | null
          events_skipped?: number | null
          id?: string
          source?: string | null
          source_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_logs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_logs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_active"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_follows: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_follows_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_follows_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_active"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          aliases: string[] | null
          capacity: number | null
          created_at: string | null
          deleted_at: string | null
          event_count: number | null
          follower_count: number | null
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          maps_url: string | null
          name: string
          province: string
          slug: string | null
        }
        Insert: {
          address?: string | null
          aliases?: string[] | null
          capacity?: number | null
          created_at?: string | null
          deleted_at?: string | null
          event_count?: number | null
          follower_count?: number | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          maps_url?: string | null
          name: string
          province: string
          slug?: string | null
        }
        Update: {
          address?: string | null
          aliases?: string[] | null
          capacity?: number | null
          created_at?: string | null
          deleted_at?: string | null
          event_count?: number | null
          follower_count?: number | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          maps_url?: string | null
          name?: string
          province?: string
          slug?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      artists_active: {
        Row: {
          bio: string | null
          created_at: string | null
          deleted_at: string | null
          facebook_url: string | null
          follower_count: number | null
          genres: string[] | null
          id: string | null
          image_url: string | null
          instagram_url: string | null
          label_id: string | null
          label_url: string | null
          name: string | null
          name_en: string | null
          popularity: number | null
          slug: string | null
          spotify_id: string | null
          tiktok_url: string | null
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          deleted_at?: string | null
          facebook_url?: string | null
          follower_count?: number | null
          genres?: string[] | null
          id?: string | null
          image_url?: string | null
          instagram_url?: string | null
          label_id?: string | null
          label_url?: string | null
          name?: string | null
          name_en?: string | null
          popularity?: number | null
          slug?: string | null
          spotify_id?: string | null
          tiktok_url?: string | null
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          deleted_at?: string | null
          facebook_url?: string | null
          follower_count?: number | null
          genres?: string[] | null
          id?: string | null
          image_url?: string | null
          instagram_url?: string | null
          label_id?: string | null
          label_url?: string | null
          name?: string | null
          name_en?: string | null
          popularity?: number | null
          slug?: string | null
          spotify_id?: string | null
          tiktok_url?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      events_active: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attendance_count: number | null
          category_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_type: string | null
          featured_type: string | null
          genres: string[] | null
          id: string | null
          is_free: boolean | null
          is_multi_day: boolean | null
          lineup_count: number | null
          parent_event_id: string | null
          poster_url: string | null
          province: string | null
          slug: string | null
          start_date: string | null
          start_time: string | null
          status: string | null
          submitted_by: string | null
          ticket_announce_date: string | null
          ticket_price_max: number | null
          ticket_price_min: number | null
          ticket_sale_end: string | null
          ticket_sale_start: string | null
          ticket_url: string | null
          title: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_count?: number | null
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string | null
          featured_type?: string | null
          genres?: string[] | null
          id?: string | null
          is_free?: boolean | null
          is_multi_day?: boolean | null
          lineup_count?: number | null
          parent_event_id?: string | null
          poster_url?: string | null
          province?: string | null
          slug?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          submitted_by?: string | null
          ticket_announce_date?: string | null
          ticket_price_max?: number | null
          ticket_price_min?: number | null
          ticket_sale_end?: string | null
          ticket_sale_start?: string | null
          ticket_url?: string | null
          title?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_count?: number | null
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string | null
          featured_type?: string | null
          genres?: string[] | null
          id?: string | null
          is_free?: boolean | null
          is_multi_day?: boolean | null
          lineup_count?: number | null
          parent_event_id?: string | null
          poster_url?: string | null
          province?: string | null
          slug?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          submitted_by?: string | null
          ticket_announce_date?: string | null
          ticket_price_max?: number | null
          ticket_price_min?: number | null
          ticket_sale_end?: string | null
          ticket_sale_start?: string | null
          ticket_url?: string | null
          title?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          artist_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          role: string | null
          theme: string | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_active"
            referencedColumns: ["id"]
          },
        ]
      }
      venues_active: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string | null
          deleted_at: string | null
          event_count: number | null
          follower_count: number | null
          id: string | null
          lat: number | null
          lng: number | null
          maps_url: string | null
          name: string | null
          province: string | null
          slug: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          deleted_at?: string | null
          event_count?: number | null
          follower_count?: number | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          maps_url?: string | null
          name?: string | null
          province?: string | null
          slug?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          deleted_at?: string | null
          event_count?: number | null
          follower_count?: number | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          maps_url?: string | null
          name?: string | null
          province?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_score: {
        Args: { pts: number; target_user_id: string }
        Returns: undefined
      }
      calc_rank: { Args: { s: number }; Returns: string }
      delete_user_data: { Args: { target_user_id: string }; Returns: undefined }
      generate_slug: { Args: { input: string }; Returns: string }
      search_artists: {
        Args: { search_term: string }
        Returns: {
          genres: string[]
          id: string
          image_url: string
          match_type: string
          name: string
          name_en: string
          relevance: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
