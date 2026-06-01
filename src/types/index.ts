// ─── Database Types ───────────────────────────────────────────────────────────

export type EventStatus = 'confirmed' | 'tba' | 'cancelled' | 'postponed' | 'sold_out'
export type UserRole    = 'admin' | 'user'
export type Genre       = 'pop' | 'rock' | 'indie' | 'hiphop' | 'jazz' | 'electronic' | 'folk' | 'rnb' | 'other'
export type EventType   = string  // ใช้ string แทน hardcode เพราะดึงจาก DB แล้ว

export interface Artist {
  id:             string
  name:           string
  name_en?:       string
  slug?:          string
  bio?:           string
  image_url?:     string
  genres:         Genre[]
  facebook_url?:  string
  instagram_url?: string
  tiktok_url?:    string
  website_url?:   string
  label_url?:     string
  created_at:     string
}

export interface Venue {
  id:         string
  name:       string
  address?:   string
  province:   string
  lat?:       number
  lng?:       number
  capacity?:  number
  maps_url?:  string
  created_at: string
}

export interface Event {
  id:           string
  title:        string
  slug?:        string
  description?: string
  event_type:   EventType
  category_id?: string        // ← ใหม่ link ไป event_categories
  status:       EventStatus
  start_date:   string
  end_date?:    string
  start_time?:  string
  end_time?:    string
  venue_id?:    string
  venue?:       Venue
  artists:      Artist[]
  genres:       Genre[]
  ticket_price_min?: number
  ticket_price_max?: number
  ticket_url?:  string
  poster_url?:  string
  is_free:      boolean
  province:     string
  submitted_by?: string
  approved_by?:  string
  approved_at?:  string
  created_at:   string
  updated_at:   string
country?: string
}

export interface Follow {
  user_id:    string
  artist_id:  string
  created_at: string
  artist?:    Artist
}

export interface Bookmark {
  user_id:   string
  event_id:  string
  created_at: string
  event?:    Event
}

export interface EventSubmission {
  id:          string
  title:       string
  artist_name: string
  venue_name:  string
  province:    string
  event_date:  string
  start_time?: string
  ticket_price?: string
  ticket_url?:  string
  description?: string
  poster_url?:  string
  status:      'pending' | 'approved' | 'rejected'
  submitted_by: string
  reviewer_note?: string
  created_at:  string
}

// ─── UI / Filter Types ───────────────────────────────────────────────────────

export interface EventFilters {
  search?:      string
  province?:    string
  genre?:       Genre
  categoryId?:      string
  regionProvinces?: string[]  // ← จังหวัดในภาคเดียวกัน
  eventType?:   EventType   // ← เก็บไว้ backward compat ลบทีหลัง
  isFree?:      boolean
  dateFrom?:    string
  dateTo?:      string
  artistId?:    string
  status?:      EventStatus
  nearMe?:      boolean
  datePreset?:  'today' | 'week' | 'month'
  userLat?:     number
  userLng?:     number
}

export type ViewMode = 'calendar' | 'list' | 'grid'

export type Theme = 'festival' | 'dark' | 'pastel' | 'vivid' | 'earth' | 'rock'

export interface ThemeConfig {
  id:     Theme
  name:   string
  label:  string
  emoji:  string
  dark:   boolean
}

// ─── Supabase DB Schema ──────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      artists:    { Row: Artist;    Insert: Omit<Artist,'id'|'created_at'>;    Update: Partial<Artist> }
      venues:     { Row: Venue;     Insert: Omit<Venue,'id'|'created_at'>;     Update: Partial<Venue> }
      events:     { Row: Event;     Insert: Omit<Event,'id'|'created_at'|'updated_at'>; Update: Partial<Event> }
      follows:    { Row: Follow;    Insert: Omit<Follow,'created_at'>;         Update: never }
      bookmarks:  { Row: Bookmark;  Insert: Omit<Bookmark,'created_at'>;       Update: never }
      event_submissions: { Row: EventSubmission; Insert: Omit<EventSubmission,'id'|'created_at'>; Update: Partial<EventSubmission> }
    }
  }
}
