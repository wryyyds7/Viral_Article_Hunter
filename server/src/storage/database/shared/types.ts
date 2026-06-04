// ABOUTME: Supabase database types generated from schema

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          hashed_password: string;
          role: string;
          status: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          username: string;
          email: string;
          hashed_password: string;
          role?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          hashed_password?: string;
          role?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_quota: {
        Row: {
          id: string;
          user_id: string;
          daily_llm_tokens: number;
          daily_rewrites: number;
          daily_collections: number;
          daily_uploads: number;
          used_llm_tokens: number;
          used_rewrites: number;
          used_collections: number;
          used_uploads: number;
          quota_reset_at: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          daily_llm_tokens?: number;
          daily_rewrites?: number;
          daily_collections?: number;
          daily_uploads?: number;
          used_llm_tokens?: number;
          used_rewrites?: number;
          used_collections?: number;
          used_uploads?: number;
          quota_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          daily_llm_tokens?: number;
          daily_rewrites?: number;
          daily_collections?: number;
          daily_uploads?: number;
          used_llm_tokens?: number;
          used_rewrites?: number;
          used_collections?: number;
          used_uploads?: number;
          quota_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      collection_task: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          platforms: unknown[];
          max_results: number;
          status: string;
          collected_count: number;
          error_message: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword: string;
          platforms?: unknown[];
          max_results?: number;
          status?: string;
          collected_count?: number;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword?: string;
          platforms?: unknown[];
          max_results?: number;
          status?: string;
          collected_count?: number;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      upload_batch: {
        Row: {
          id: string;
          user_id: string;
          total_count: number;
          success_count: number;
          fail_count: number;
          threshold_met: boolean;
          status: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_count?: number;
          success_count?: number;
          fail_count?: number;
          threshold_met?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_count?: number;
          success_count?: number;
          fail_count?: number;
          threshold_met?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      upload_file: {
        Row: {
          id: string;
          batch_id: string;
          user_id: string;
          original_name: string;
          file_format: string;
          file_size: number;
          storage_key: string | null;
          status: string;
          parsed_title: string | null;
          article_id: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          batch_id: string;
          user_id: string;
          original_name: string;
          file_format: string;
          file_size: number;
          storage_key?: string | null;
          status?: string;
          parsed_title?: string | null;
          article_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          user_id?: string;
          original_name?: string;
          file_format?: string;
          file_size?: number;
          storage_key?: string | null;
          status?: string;
          parsed_title?: string | null;
          article_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      article: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          content: string;
          summary: string | null;
          source_url: string | null;
          source_platform: string | null;
          source_author: string | null;
          collection_method: string | null;
          collection_task_id: string | null;
          upload_file_id: string | null;
          is_favorited: boolean;
          tags: unknown[] | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          content: string;
          summary?: string | null;
          source_url?: string | null;
          source_platform?: string | null;
          source_author?: string | null;
          collection_method?: string | null;
          collection_task_id?: string | null;
          upload_file_id?: string | null;
          is_favorited?: boolean;
          tags?: unknown[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          content?: string;
          summary?: string | null;
          source_url?: string | null;
          source_platform?: string | null;
          source_author?: string | null;
          collection_method?: string | null;
          collection_task_id?: string | null;
          upload_file_id?: string | null;
          is_favorited?: boolean;
          tags?: unknown[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      analysis_result: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          hotness_score: unknown | null;
          emotion_tags: unknown[] | null;
          title_formulas: unknown[] | null;
          structure_template: unknown | null;
          interaction_analysis: unknown | null;
          top_3_genes: unknown[] | null;
          platform_fit: unknown[] | null;
          raw_llm_response: unknown | null;
          llm_model: string | null;
          llm_tokens_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          hotness_score?: unknown | null;
          emotion_tags?: unknown[] | null;
          title_formulas?: unknown[] | null;
          structure_template?: unknown | null;
          interaction_analysis?: unknown | null;
          top_3_genes?: unknown[] | null;
          platform_fit?: unknown[] | null;
          raw_llm_response?: unknown | null;
          llm_model?: string | null;
          llm_tokens_used?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string;
          hotness_score?: unknown | null;
          emotion_tags?: unknown[] | null;
          title_formulas?: unknown[] | null;
          structure_template?: unknown | null;
          interaction_analysis?: unknown | null;
          top_3_genes?: unknown[] | null;
          platform_fit?: unknown[] | null;
          raw_llm_response?: unknown | null;
          llm_model?: string | null;
          llm_tokens_used?: number | null;
          created_at?: string;
        };
      };
      rewrite_task: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          target_platforms: unknown[];
          style_overrides: unknown | null;
          status: string;
          llm_calls: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          target_platforms?: unknown[];
          style_overrides?: unknown | null;
          status?: string;
          llm_calls?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string;
          target_platforms?: unknown[];
          style_overrides?: unknown | null;
          status?: string;
          llm_calls?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      rewrite_result: {
        Row: {
          id: string;
          task_id: string;
          platform: string;
          title: string | null;
          content: string | null;
          similarity_score: number | null;
          quality_score: unknown | null;
          word_count: number | null;
          rewrite_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          platform: string;
          title?: string | null;
          content?: string | null;
          similarity_score?: number | null;
          quality_score?: unknown | null;
          word_count?: number | null;
          rewrite_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          platform?: string;
          title?: string | null;
          content?: string | null;
          similarity_score?: number | null;
          quality_score?: unknown | null;
          word_count?: number | null;
          rewrite_notes?: string | null;
          created_at?: string;
        };
      };
      favorite_group: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sort_order: number;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          sort_order?: number;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          sort_order?: number;
          color?: string | null;
          created_at?: string;
        };
      };
      favorite: {
        Row: {
          id: string;
          user_id: string;
          article_id: string;
          group_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          article_id: string;
          group_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          article_id?: string;
          group_id?: string | null;
          created_at?: string;
        };
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_type: string | null;
          target_id: string | null;
          detail: unknown | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          detail?: unknown | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          detail?: unknown | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          service: string;
          encrypted_key: string;
          key_hint: string | null;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          service: string;
          encrypted_key: string;
          key_hint?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service?: string;
          encrypted_key?: string;
          key_hint?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_config: {
        Row: {
          key: string;
          value: unknown;
          description: string | null;
          config_group: string | null;
          updated_at: string | null;
        };
        Insert: {
          key: string;
          value: unknown;
          description?: string | null;
          config_group?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: unknown;
          description?: string | null;
          config_group?: string | null;
          updated_at?: string;
        };
      };
      health_check: {
        Row: {
          id: number;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
