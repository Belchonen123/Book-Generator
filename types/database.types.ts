export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionTierDb = "free" | "pro";

export type BookStatusDb =
  | "idea"
  | "refining"
  | "outlining"
  | "writing"
  | "editing"
  | "cover"
  | "complete";

/** Drives AI prompts (idea → outline → chapter). */
export type BookTypeDb = "fiction" | "non_fiction";

export type ChapterStatusDb =
  | "pending"
  | "generating"
  | "draft"
  | "edited"
  | "approved";

/** Origin of a chapter_revisions row. Kept in sync with the CHECK in migration 022. */
export type ChapterRevisionSource =
  | "generation"
  | "manual_save"
  | "assist_expand"
  | "assist_tone"
  | "regenerate"
  | "restore"
  | "rewrite_transition"
  | "regenerate_for_outline"
  | "find_replace";

/* ==========================================================================
 * Prompt 16 — Series expansion
 * ========================================================================== */

export type SeriesStatusDb =
  | "planning"
  | "active"
  | "complete"
  | "abandoned";

export type CodexEntryScopeDb = "project" | "series" | "shared";

export type CodexEntryTypeDb =
  | "character"
  | "location"
  | "faction"
  | "object"
  | "lore"
  | "subplot"
  | "custom";

/** Added in migration 031. Governs AI prompt auto-injection behavior. */
export type CodexEntryAiScopeDb = "always" | "on_match" | "never";

/** Shape of each edge stored in `codex_entries.relations` (JSONB). */
export type CodexEntryRelationDb = {
  targetId: string;
  label: string;
};

export type SeriesArcTypeDb =
  | "character"
  | "plot"
  | "thematic"
  | "romance"
  | "mystery"
  | "world"
  | "custom";

export type SeriesArcStatusDb =
  | "setup"
  | "developing"
  | "climax"
  | "resolved"
  | "abandoned";

export type SeriesArcBeatTypeDb =
  | "setup"
  | "foreshadow"
  | "development"
  | "complication"
  | "payoff"
  | "resolution";

export type SeriesArcBeatStatusDb = "planned" | "drafted" | "complete";

export type ContinuityWarningStatusDb = "active" | "dismissed" | "resolved";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          pen_name: string | null;
          website: string | null;
          location: string | null;
          twitter_handle: string | null;
          stripe_customer_id: string | null;
          subscription_tier: SubscriptionTierDb;
          books_generated: number;
          has_seen_onboarding: boolean;
          payment_failed_at: string | null;
          payment_failure_reason: string | null;
          /** Merged from migration 024. Editor toggles, etc. */
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          pen_name?: string | null;
          website?: string | null;
          location?: string | null;
          twitter_handle?: string | null;
          stripe_customer_id?: string | null;
          subscription_tier?: SubscriptionTierDb;
          books_generated?: number;
          has_seen_onboarding?: boolean;
          payment_failed_at?: string | null;
          payment_failure_reason?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          pen_name?: string | null;
          website?: string | null;
          location?: string | null;
          twitter_handle?: string | null;
          stripe_customer_id?: string | null;
          subscription_tier?: SubscriptionTierDb;
          books_generated?: number;
          has_seen_onboarding?: boolean;
          payment_failed_at?: string | null;
          payment_failure_reason?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      series: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          shared_character_bible: Json;
          shared_world_notes: string | null;
          tagline: string | null;
          genre: string | null;
          planned_book_count: number | null;
          status: SeriesStatusDb;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          shared_character_bible?: Json;
          shared_world_notes?: string | null;
          tagline?: string | null;
          genre?: string | null;
          planned_book_count?: number | null;
          status?: SeriesStatusDb;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          shared_character_bible?: Json;
          shared_world_notes?: string | null;
          tagline?: string | null;
          genre?: string | null;
          planned_book_count?: number | null;
          status?: SeriesStatusDb;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "series_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          subtitle: string | null;
          author_display_name: string | null;
          book_type: BookTypeDb;
          genre: string | null;
          target_audience: string | null;
          tone: string | null;
          raw_idea: string | null;
          refined_idea: Json | null;
          character_bible: Json | null;
          idea_conversation: Json;
          status: BookStatusDb;
          cover_prompt: string | null;
          cover_url: string | null;
          back_cover_copy: string | null;
          about_author: string | null;
          kdp_instructions: string | null;
          word_count: number;
          chapter_count: number;
          series_id: string | null;
          series_order: number | null;
          previously_in_series: string | null;
          reading_order_note: string | null;
          style_examples: string | null;
          style_instructions: string | null;
          /* Added in migration 033. Prompt 16 PRIOR-BOOK SUMMARIZATION. */
          series_plot_summary: string | null;
          series_end_state_dossier: string | null;
          series_summary_data: Json;
          series_summary_generated_at: string | null;
          /* Added in migration 044. Prompt 16.4 source-hash for stale detection. */
          series_summary_source_hash: string | null;
          /* Added in migration 034. Prompt 16 continuity (plot-hole) detection. */
          continuity_checks_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          subtitle?: string | null;
          author_display_name?: string | null;
          book_type?: BookTypeDb;
          genre?: string | null;
          target_audience?: string | null;
          tone?: string | null;
          raw_idea?: string | null;
          refined_idea?: Json | null;
          character_bible?: Json | null;
          idea_conversation?: Json;
          status?: BookStatusDb;
          cover_prompt?: string | null;
          cover_url?: string | null;
          back_cover_copy?: string | null;
          about_author?: string | null;
          kdp_instructions?: string | null;
          word_count?: number;
          chapter_count?: number;
          series_id?: string | null;
          series_order?: number | null;
          previously_in_series?: string | null;
          reading_order_note?: string | null;
          style_examples?: string | null;
          style_instructions?: string | null;
          series_plot_summary?: string | null;
          series_end_state_dossier?: string | null;
          series_summary_data?: Json;
          series_summary_generated_at?: string | null;
          series_summary_source_hash?: string | null;
          continuity_checks_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          subtitle?: string | null;
          author_display_name?: string | null;
          book_type?: BookTypeDb;
          genre?: string | null;
          target_audience?: string | null;
          tone?: string | null;
          raw_idea?: string | null;
          refined_idea?: Json | null;
          character_bible?: Json | null;
          idea_conversation?: Json;
          status?: BookStatusDb;
          cover_prompt?: string | null;
          cover_url?: string | null;
          back_cover_copy?: string | null;
          about_author?: string | null;
          kdp_instructions?: string | null;
          word_count?: number;
          chapter_count?: number;
          series_id?: string | null;
          series_order?: number | null;
          previously_in_series?: string | null;
          reading_order_note?: string | null;
          style_examples?: string | null;
          style_instructions?: string | null;
          series_plot_summary?: string | null;
          series_end_state_dossier?: string | null;
          series_summary_data?: Json;
          series_summary_generated_at?: string | null;
          series_summary_source_hash?: string | null;
          continuity_checks_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "books_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "books_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "series";
            referencedColumns: ["id"];
          },
        ];
      };
      outlines: {
        Row: {
          id: string;
          book_id: string;
          sections: Json;
          approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          sections?: Json;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          sections?: Json;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outlines_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: true;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      chapters: {
        Row: {
          id: string;
          book_id: string;
          chapter_number: number;
          title: string;
          outline_summary: string | null;
          author_notes: string | null;
          content: string | null;
          word_count: number;
          target_word_count: number | null;
          status: ChapterStatusDb;
          generation_count: number;
          /* Added in migration 032. AI-generated 1-paragraph summary used
           * as prior-chapter context for later AI generations. */
          ai_summary: string | null;
          ai_summary_hash: string | null;
          ai_summary_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_number: number;
          title: string;
          outline_summary?: string | null;
          author_notes?: string | null;
          content?: string | null;
          word_count?: number;
          target_word_count?: number | null;
          status?: ChapterStatusDb;
          generation_count?: number;
          ai_summary?: string | null;
          ai_summary_hash?: string | null;
          ai_summary_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_number?: number;
          title?: string;
          outline_summary?: string | null;
          author_notes?: string | null;
          content?: string | null;
          word_count?: number;
          target_word_count?: number | null;
          status?: ChapterStatusDb;
          generation_count?: number;
          ai_summary?: string | null;
          ai_summary_hash?: string | null;
          ai_summary_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      api_usage: {
        Row: {
          id: string;
          user_id: string;
          route: string;
          tokens_used: number;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          route: string;
          tokens_used?: number;
          model?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          route?: string;
          tokens_used?: number;
          model?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audio_exports: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          voice_id: string;
          voice_name: string;
          status: "queued" | "generating" | "ready" | "failed";
          progress: number;
          zip_storage_path: string | null;
          total_duration_seconds: number | null;
          error: string | null;
          chapter_states: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          voice_id: string;
          voice_name: string;
          status?: "queued" | "generating" | "ready" | "failed";
          progress?: number;
          zip_storage_path?: string | null;
          total_duration_seconds?: number | null;
          error?: string | null;
          chapter_states?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          voice_id?: string;
          voice_name?: string;
          status?: "queued" | "generating" | "ready" | "failed";
          progress?: number;
          zip_storage_path?: string | null;
          total_duration_seconds?: number | null;
          error?: string | null;
          chapter_states?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audio_exports_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audio_exports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chapter_revisions: {
        Row: {
          id: string;
          chapter_id: string;
          book_id: string;
          user_id: string;
          content: string;
          word_count: number;
          source: ChapterRevisionSource;
          title_snapshot: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          book_id: string;
          user_id: string;
          content: string;
          word_count?: number;
          source: ChapterRevisionSource;
          title_snapshot: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          chapter_id?: string;
          book_id?: string;
          user_id?: string;
          content?: string;
          word_count?: number;
          source?: ChapterRevisionSource;
          title_snapshot?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_revisions_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_revisions_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_revisions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chapter_beats: {
        Row: {
          id: string;
          chapter_id: string;
          book_id: string;
          beats: Json;
          model: string;
          analyzed_at: string;
          content_hash: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          book_id: string;
          beats: Json;
          model: string;
          analyzed_at?: string;
          content_hash: string;
        };
        Update: {
          id?: string;
          chapter_id?: string;
          book_id?: string;
          beats?: Json;
          model?: string;
          analyzed_at?: string;
          content_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_beats_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_beats_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      book_events: {
        Row: {
          id: string;
          user_id: string;
          book_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string | null;
          event_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "book_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "book_events_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      codex_entries: {
        Row: {
          id: string;
          user_id: string;
          book_id: string | null;
          series_id: string | null;
          scope: CodexEntryScopeDb;
          entry_type: CodexEntryTypeDb;
          name: string;
          aliases: string[];
          summary: string | null;
          description_md: string;
          custom_fields: Json;
          ai_scope: CodexEntryAiScopeDb;
          relations: Json;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id?: string | null;
          series_id?: string | null;
          scope?: CodexEntryScopeDb;
          entry_type?: CodexEntryTypeDb;
          name: string;
          aliases?: string[];
          summary?: string | null;
          description_md?: string;
          custom_fields?: Json;
          ai_scope?: CodexEntryAiScopeDb;
          relations?: Json;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string | null;
          series_id?: string | null;
          scope?: CodexEntryScopeDb;
          entry_type?: CodexEntryTypeDb;
          name?: string;
          aliases?: string[];
          summary?: string | null;
          description_md?: string;
          custom_fields?: Json;
          ai_scope?: CodexEntryAiScopeDb;
          relations?: Json;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "codex_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "codex_entries_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "codex_entries_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "series";
            referencedColumns: ["id"];
          },
        ];
      };
      codex_entry_overlays: {
        Row: {
          id: string;
          codex_entry_id: string;
          book_id: string;
          field_overrides: Json;
          description_override: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codex_entry_id: string;
          book_id: string;
          field_overrides?: Json;
          description_override?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codex_entry_id?: string;
          book_id?: string;
          field_overrides?: Json;
          description_override?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "codex_entry_overlays_codex_entry_id_fkey";
            columns: ["codex_entry_id"];
            isOneToOne: false;
            referencedRelation: "codex_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "codex_entry_overlays_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      continuity_warnings: {
        Row: {
          id: string;
          book_id: string;
          chapter_id: string;
          excerpt: string;
          issue: string;
          suggestion: string | null;
          codex_entry_ids: string[];
          status: ContinuityWarningStatusDb;
          dismissed_at: string | null;
          resolved_at: string | null;
          model_output: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_id: string;
          excerpt: string;
          issue: string;
          suggestion?: string | null;
          codex_entry_ids?: string[];
          status?: ContinuityWarningStatusDb;
          dismissed_at?: string | null;
          resolved_at?: string | null;
          model_output?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_id?: string;
          excerpt?: string;
          issue?: string;
          suggestion?: string | null;
          codex_entry_ids?: string[];
          status?: ContinuityWarningStatusDb;
          dismissed_at?: string | null;
          resolved_at?: string | null;
          model_output?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "continuity_warnings_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "continuity_warnings_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      series_ai_generation_logs: {
        Row: {
          id: string;
          user_id: string;
          series_id: string;
          book_id: string | null;
          chapter_id: string | null;
          operation: string;
          model: string | null;
          blocks_used: Json;
          prior_books_count: number;
          progressions_count: number;
          codex_entries_count: number;
          arc_ids: string[];
          codex_entry_ids: string[];
          prior_book_ids: string[];
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          series_id: string;
          book_id?: string | null;
          chapter_id?: string | null;
          operation: string;
          model?: string | null;
          blocks_used?: Json;
          prior_books_count?: number;
          progressions_count?: number;
          codex_entries_count?: number;
          arc_ids?: string[];
          codex_entry_ids?: string[];
          prior_book_ids?: string[];
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          series_id?: string;
          book_id?: string | null;
          chapter_id?: string | null;
          operation?: string;
          model?: string | null;
          blocks_used?: Json;
          prior_books_count?: number;
          progressions_count?: number;
          codex_entries_count?: number;
          arc_ids?: string[];
          codex_entry_ids?: string[];
          prior_book_ids?: string[];
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "series_ai_generation_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "series_ai_generation_logs_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "series_ai_generation_logs_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "series_ai_generation_logs_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      codex_progressions: {
        Row: {
          id: string;
          codex_entry_id: string;
          book_id: string;
          chapter_id: string | null;
          event_type: string;
          description: string;
          position_hint: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          codex_entry_id: string;
          book_id: string;
          chapter_id?: string | null;
          event_type: string;
          description: string;
          position_hint?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          codex_entry_id?: string;
          book_id?: string;
          chapter_id?: string | null;
          event_type?: string;
          description?: string;
          position_hint?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "codex_progressions_codex_entry_id_fkey";
            columns: ["codex_entry_id"];
            isOneToOne: false;
            referencedRelation: "codex_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "codex_progressions_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "codex_progressions_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      series_arcs: {
        Row: {
          id: string;
          series_id: string;
          name: string;
          description_md: string | null;
          arc_type: SeriesArcTypeDb | null;
          status: SeriesArcStatusDb;
          starts_book_id: string | null;
          ends_book_id: string | null;
          linked_codex_entry_ids: string[];
          /* Added in migration 042. Optional hex #RRGGBB used to tint the
           * arc on the timeline/beat board. NULL = neutral. */
          display_color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          series_id: string;
          name: string;
          description_md?: string | null;
          arc_type?: SeriesArcTypeDb | null;
          status?: SeriesArcStatusDb;
          starts_book_id?: string | null;
          ends_book_id?: string | null;
          linked_codex_entry_ids?: string[];
          display_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          series_id?: string;
          name?: string;
          description_md?: string | null;
          arc_type?: SeriesArcTypeDb | null;
          status?: SeriesArcStatusDb;
          starts_book_id?: string | null;
          ends_book_id?: string | null;
          linked_codex_entry_ids?: string[];
          display_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "series_arcs_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "series";
            referencedColumns: ["id"];
          },
        ];
      };
      series_arc_beats: {
        Row: {
          id: string;
          arc_id: string;
          book_id: string | null;
          chapter_id: string | null;
          position: number;
          beat_type: SeriesArcBeatTypeDb | null;
          description: string;
          status: SeriesArcBeatStatusDb;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          arc_id: string;
          book_id?: string | null;
          chapter_id?: string | null;
          position: number;
          beat_type?: SeriesArcBeatTypeDb | null;
          description: string;
          status?: SeriesArcBeatStatusDb;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          arc_id?: string;
          book_id?: string | null;
          chapter_id?: string | null;
          position?: number;
          beat_type?: SeriesArcBeatTypeDb | null;
          description?: string;
          status?: SeriesArcBeatStatusDb;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "series_arc_beats_arc_id_fkey";
            columns: ["arc_id"];
            isOneToOne: false;
            referencedRelation: "series_arcs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "series_arc_beats_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "series_arc_beats_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      series_foreshadowing_pairs: {
        Row: {
          id: string;
          foreshadow_beat_id: string;
          payoff_beat_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          foreshadow_beat_id: string;
          payoff_beat_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          foreshadow_beat_id?: string;
          payoff_beat_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "series_foreshadowing_pairs_foreshadow_beat_id_fkey";
            columns: ["foreshadow_beat_id"];
            isOneToOne: true;
            referencedRelation: "series_arc_beats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "series_foreshadowing_pairs_payoff_beat_id_fkey";
            columns: ["payoff_beat_id"];
            isOneToOne: false;
            referencedRelation: "series_arc_beats";
            referencedColumns: ["id"];
          },
        ];
      };
      series_metadata: {
        Row: {
          series_id: string;
          kdp_series_name: string | null;
          kdp_series_number_format: string;
          amazon_series_asin: string | null;
          boxed_set_title: string | null;
          boxed_set_description: string | null;
          cross_promo_copy_md: string | null;
          also_by_author_list_md: string | null;
          reading_order_copy_md: string | null;
          boxed_set_dedication_md: string | null;
          boxed_set_author_note_md: string | null;
          newsletter_signup_copy_md: string | null;
          boxed_set_included_book_ids: string[] | null;
          audiobook_bundle_metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          series_id: string;
          kdp_series_name?: string | null;
          kdp_series_number_format?: string;
          amazon_series_asin?: string | null;
          boxed_set_title?: string | null;
          boxed_set_description?: string | null;
          cross_promo_copy_md?: string | null;
          also_by_author_list_md?: string | null;
          reading_order_copy_md?: string | null;
          boxed_set_dedication_md?: string | null;
          boxed_set_author_note_md?: string | null;
          newsletter_signup_copy_md?: string | null;
          boxed_set_included_book_ids?: string[] | null;
          audiobook_bundle_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          series_id?: string;
          kdp_series_name?: string | null;
          kdp_series_number_format?: string;
          amazon_series_asin?: string | null;
          boxed_set_title?: string | null;
          boxed_set_description?: string | null;
          cross_promo_copy_md?: string | null;
          also_by_author_list_md?: string | null;
          reading_order_copy_md?: string | null;
          boxed_set_dedication_md?: string | null;
          boxed_set_author_note_md?: string | null;
          newsletter_signup_copy_md?: string | null;
          boxed_set_included_book_ids?: string[] | null;
          audiobook_bundle_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "series_metadata_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: true;
            referencedRelation: "series";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_threads: {
        Row: {
          id: string;
          project_id: string;
          chapter_id: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          chapter_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          chapter_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_threads_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_threads_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          mentions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          mentions?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          mentions?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "chat_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      prompt_templates: {
        Row: {
          id: string;
          user_id: string | null;
          project_id: string | null;
          task_id: string;
          name: string;
          template_text: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          task_id: string;
          name: string;
          template_text: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          task_id?: string;
          name?: string;
          template_text?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_templates_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      brainstorm_sessions: {
        Row: {
          id: string;
          project_id: string;
          topic: string;
          prompt: string;
          title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          topic: string;
          prompt: string;
          title?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          topic?: string;
          prompt?: string;
          title?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brainstorm_sessions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      brainstorm_items: {
        Row: {
          id: string;
          session_id: string;
          content: string;
          is_keeper: boolean;
          is_hidden: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          content: string;
          is_keeper?: boolean;
          is_hidden?: boolean;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          content?: string;
          is_keeper?: boolean;
          is_hidden?: boolean;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brainstorm_items_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "brainstorm_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      persist_chapter_generation: {
        Args: {
          p_book_id: string;
          p_chapter_id: string;
          p_content: string;
          p_source: string;
          p_word_count: number;
        };
        Returns: {
          book_total_words: number;
          generation_count: number;
        }[];
      };
      reorder_series_books: {
        Args: {
          p_series_id: string;
          p_book_ids: string[];
        };
        Returns: void;
      };
      /** Migration 018 / 048 — atomic chapter reorder. */
      reorder_chapters: {
        Args: {
          p_book_id: string;
          p_ordered_ids: string[];
        };
        Returns: void;
      };
      /** Migration 047 — sum chapters.word_count into books.word_count. */
      recompute_book_word_count: {
        Args: {
          p_book_id: string;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
