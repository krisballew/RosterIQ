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

export type PlayerStatus = "active" | "inactive" | "practice_only";

export interface Player {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  team_assigned: string | null;
  age_division: string | null;
  date_of_birth: string | null;
  primary_parent_email: string | null;
  secondary_parent_email: string | null;
  status: PlayerStatus;
  /** Preferred positions, e.g. ["ST", "RW"] */
  positions: string[];
  /** Birth year for age eligibility checks */
  birth_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  tenant_id: string;
  name: string;
  age_division: string | null;
  /** Eligibility birth year for the team */
  birth_year: number | null;
  roster_limit: number;
  created_at: string;
  updated_at: string;
}

export interface Lineup {
  id: string;
  tenant_id: string;
  team_id: string;
  formation: FormationKey;
  /** Map of slotKey → player_id | null */
  slots: Record<string, string | null>;
  created_at: string;
  updated_at: string;
}

export type FormationKey = "4-3-3" | "4-4-2" | "3-5-2";

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
      players: {
        Row: Player;
        Insert: Omit<Player, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Player, "id" | "tenant_id">>;
        Relationships: [];
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Team, "id" | "tenant_id">>;
        Relationships: [];
      };
      lineups: {
        Row: Lineup;
        Insert: Omit<Lineup, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Lineup, "id" | "tenant_id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
