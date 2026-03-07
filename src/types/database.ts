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
  membership_id: string | null;
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
  /** Optional assigned coach membership id */
  coach_membership_id: string | null;
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

export type FormationKey =
  | "4v4-1-2" | "4v4-2-1"
  | "7v7-2-3-1" | "7v7-3-2-1" | "7v7-1-3-2"
  | "9v9-3-3-2" | "9v9-2-4-2" | "9v9-3-2-3"
  | "11v11-4-3-3" | "11v11-4-4-2" | "11v11-3-5-2";

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

export type ReviewSeason = "fall" | "spring";

export type PlayerReviewStatus = "draft" | "published" | "completed";

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

export interface ReviewPeriod {
  id: string;
  tenant_id: string;
  season: ReviewSeason;
  season_year: number;
  title: string;
  due_date: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerReview {
  id: string;
  tenant_id: string;
  player_id: string;
  team_id: string | null;
  review_period_id: string;
  reviewer_membership_id: string | null;
  status: PlayerReviewStatus;
  ratings: Record<string, "red" | "yellow" | "green">;
  key_strengths: string;
  growth_areas: string;
  coach_notes: string;
  shared_at: string | null;
  published_at: string | null;
  accepted_by_user_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Training Management Types
export type TrainingContentType = "video" | "document" | "lesson" | "article";
export type TrainingAudience = "player" | "coach" | "both";
export type AgeDivision = "U6" | "U7" | "U8" | "U9" | "U10" | "U11" | "U12" | "U13" | "U14" | "U15" | "U16" | "U17" | "U18" | "U19";
export type GenderFilter = "boys" | "girls" | "both";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "all";

export interface TrainingCategory {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  parent_category_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingContent {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  content_type: TrainingContentType;
  audience: TrainingAudience;
  min_age_division: AgeDivision | null;
  max_age_division: AgeDivision | null;
  gender_filter: GenderFilter | null;
  skill_level: SkillLevel | null;
  video_url: string | null;
  document_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  content_body: string | null;
  category_id: string | null;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingAssignment {
  id: string;
  tenant_id: string;
  content_id: string;
  assigned_by: string;
  assigned_at: string;
  player_id: string | null;
  team_id: string | null;
  assignment_note: string | null;
  due_date: string | null;
  is_required: boolean;
  created_at: string;
}

export interface TrainingProgress {
  id: string;
  tenant_id: string;
  content_id: string;
  membership_id: string;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  completion_percentage: number;
  is_completed: boolean;
  completed_at: string | null;
  rating: number | null;
  feedback_text: string | null;
  created_at: string;
  updated_at: string;
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
      review_periods: {
        Row: ReviewPeriod;
        Insert: Omit<ReviewPeriod, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ReviewPeriod, "id" | "tenant_id">>;
        Relationships: [];
      };
      player_reviews: {
        Row: PlayerReview;
        Insert: Omit<PlayerReview, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PlayerReview, "id" | "tenant_id" | "player_id" | "review_period_id">>;
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
      training_categories: {
        Row: TrainingCategory;
        Insert: Omit<TrainingCategory, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TrainingCategory, "id" | "tenant_id">>;
        Relationships: [];
      };
      training_content: {
        Row: TrainingContent;
        Insert: Omit<TrainingContent, "id" | "created_at" | "updated_at" | "view_count"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          view_count?: number;
        };
        Update: Partial<Omit<TrainingContent, "id" | "tenant_id">>;
        Relationships: [];
      };
      training_assignments: {
        Row: TrainingAssignment;
        Insert: Omit<TrainingAssignment, "id" | "created_at" | "assigned_at"> & {
          id?: string;
          created_at?: string;
          assigned_at?: string;
        };
        Update: Partial<Omit<TrainingAssignment, "id" | "tenant_id" | "content_id">>;
        Relationships: [];
      };
      training_progress: {
        Row: TrainingProgress;
        Insert: Omit<TrainingProgress, "id" | "created_at" | "updated_at" | "view_count"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          view_count?: number;
        };
        Update: Partial<Omit<TrainingProgress, "id" | "tenant_id" | "content_id" | "membership_id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
