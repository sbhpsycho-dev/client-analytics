export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          system_role: "agency_admin" | "agency_agent" | "client";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          system_role?: "agency_admin" | "agency_agent" | "client";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          system_role?: "agency_admin" | "agency_agent" | "client";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: never[];
      };
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          brand_color: string;
          default_theme: "light" | "dark";
          status: "active" | "suspended" | "inactive";
          assigned_agent_id: string | null;
          welcome_message: string | null;
          monthly_goal: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          logo_url?: string | null;
          brand_color?: string;
          default_theme?: "light" | "dark";
          status?: "active" | "suspended" | "inactive";
          assigned_agent_id?: string | null;
          welcome_message?: string | null;
          monthly_goal?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          logo_url?: string | null;
          brand_color?: string;
          default_theme?: "light" | "dark";
          status?: "active" | "suspended" | "inactive";
          assigned_agent_id?: string | null;
          welcome_message?: string | null;
          monthly_goal?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: never[];
      };
      tenant_memberships: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          role: "client_owner" | "client_manager" | "client_setter" | "client_closer";
          invited_by: string | null;
          invite_token: string | null;
          invite_email: string | null;
          invite_status: "pending" | "accepted" | "revoked";
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          role: "client_owner" | "client_manager" | "client_setter" | "client_closer";
          invited_by?: string | null;
          invite_token?: string | null;
          invite_email?: string | null;
          invite_status?: "pending" | "accepted" | "revoked";
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          role?: "client_owner" | "client_manager" | "client_setter" | "client_closer";
          invited_by?: string | null;
          invite_token?: string | null;
          invite_email?: string | null;
          invite_status?: "pending" | "accepted" | "revoked";
          created_at?: string;
          accepted_at?: string | null;
        };
        Relationships: never[];
      };
      sheet_connections: {
        Row: {
          id: string;
          tenant_id: string;
          agent_user_id: string;
          sheet_id: string;
          sheet_name: string | null;
          sheet_url: string | null;
          tab_calls: string;
          tab_leads: string;
          tab_team: string;
          column_mapping: Json;
          mapping_template_id: string | null;
          oauth_access_token: string | null;
          oauth_refresh_token: string | null;
          oauth_token_expiry: string | null;
          sync_enabled: boolean;
          sync_interval_minutes: number;
          last_synced_at: string | null;
          last_sync_status: "pending" | "running" | "success" | "error";
          last_sync_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          agent_user_id: string;
          sheet_id: string;
          sheet_name?: string | null;
          sheet_url?: string | null;
          tab_calls?: string;
          tab_leads?: string;
          tab_team?: string;
          column_mapping?: Json;
          mapping_template_id?: string | null;
          oauth_access_token?: string | null;
          oauth_refresh_token?: string | null;
          oauth_token_expiry?: string | null;
          sync_enabled?: boolean;
          sync_interval_minutes?: number;
          last_synced_at?: string | null;
          last_sync_status?: "pending" | "running" | "success" | "error";
          last_sync_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sheet_connections"]["Insert"]>;
        Relationships: never[];
      };
      mapping_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string | null;
          mapping: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_by?: string | null;
          mapping: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mapping_templates"]["Insert"]>;
        Relationships: never[];
      };
      sync_logs: {
        Row: {
          id: string;
          sheet_connection_id: string;
          tenant_id: string;
          started_at: string;
          completed_at: string | null;
          status: "running" | "success" | "error" | "partial";
          rows_processed: number;
          rows_imported: number;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sheet_connection_id: string;
          tenant_id: string;
          started_at?: string;
          completed_at?: string | null;
          status?: "running" | "success" | "error" | "partial";
          rows_processed?: number;
          rows_imported?: number;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sync_logs"]["Insert"]>;
        Relationships: never[];
      };
      calls: {
        Row: {
          id: string;
          tenant_id: string;
          sheet_row_index: number;
          date: string | null;
          setter: string | null;
          closer: string | null;
          lead_name: string | null;
          call_booked_at: string | null;
          call_scheduled_at: string | null;
          status: "booked" | "showed" | "no-show" | "rescheduled" | "canceled" | null;
          outcome: "closed" | "follow-up" | "lost" | null;
          cash_collected: number | null;
          contract_value: number | null;
          excluded: boolean;
          exclusion_reason: string | null;
          raw_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          sheet_row_index?: number | null;
          date?: string | null;
          setter?: string | null;
          closer?: string | null;
          lead_name?: string | null;
          call_booked_at?: string | null;
          call_scheduled_at?: string | null;
          status?: "booked" | "showed" | "no-show" | "rescheduled" | "canceled" | null;
          outcome?: "closed" | "follow-up" | "lost" | null;
          cash_collected?: number | null;
          contract_value?: number | null;
          excluded?: boolean;
          exclusion_reason?: string | null;
          raw_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["calls"]["Insert"]>;
        Relationships: never[];
      };
      leads: {
        Row: {
          id: string;
          tenant_id: string;
          sheet_row_index: number | null;
          date: string | null;
          source: string | null;
          lead_name: string | null;
          setter: string | null;
          status: string | null;
          notes: string | null;
          excluded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          sheet_row_index?: number | null;
          date?: string | null;
          source?: string | null;
          lead_name?: string | null;
          setter?: string | null;
          status?: string | null;
          notes?: string | null;
          excluded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: never[];
      };
      team_members: {
        Row: {
          id: string;
          tenant_id: string;
          name: string | null;
          role: "setter" | "closer" | "manager" | null;
          email: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name?: string | null;
          role?: "setter" | "closer" | "manager" | null;
          email?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
        Relationships: never[];
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string | null;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: never[];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_agency_admin: { Args: Record<never, never>; Returns: boolean };
      is_agency_staff: { Args: Record<never, never>; Returns: boolean };
      tenant_role: { Args: { p_tenant_id: string }; Returns: string | null };
      has_tenant_access: { Args: { p_tenant_id: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
