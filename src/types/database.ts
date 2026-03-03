export type Role =
  | "platform_admin"
  | "club_admin"
  | "club_director"
  | "director_of_coaching"
  | "select_coach"
  | "academy_coach"
  | "select_player"
  | "academy_player";

export type TenantStatus = "active" | "inactive" | "suspended";

export interface Tenant {
  id: string;
  name: string;
  timezone: string;
  address_text: string | null;
  logo_url: string | null;
  status: TenantStatus;
  created_at: string;
}

export interface Profile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
}

export interface Membership {
  id: string;
  user_id: string;
  tenant_id: string | null;
  role: Role;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  actor_user_id: string | null;
  tenant_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AccessCode {
  id: string;
  code: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
}

export type AccessRequestStatus = "pending" | "approved" | "rejected";

export interface AccessRequest {
  id: string;
  tenant_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  status: AccessRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: Tenant;
        Insert: Omit<Tenant, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Tenant, "id">>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { user_id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      memberships: {
        Row: Membership;
        Insert: Omit<Membership, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Membership, "id">>;
        Relationships: [];
      };
      audit_events: {
        Row: AuditEvent;
        Insert: Omit<AuditEvent, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AuditEvent, "id">>;
        Relationships: [];
      };
      access_codes: {
        Row: AccessCode;
        Insert: Omit<AccessCode, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AccessCode, "id">>;
        Relationships: [];
      };
      access_requests: {
        Row: AccessRequest;
        Insert: Omit<AccessRequest, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AccessRequest, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
