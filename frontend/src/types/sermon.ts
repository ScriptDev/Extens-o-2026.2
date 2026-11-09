export interface BiblicalPoint {
  titulo: string;
  explicacao: string;
  referencia_biblica: string;
  aplicacao_pratica?: string;
}

export interface StructuredContent {
  tema: string;
  introducao: string;
  pontos_principais: BiblicalPoint[];
  conclusao: string;
  frases_de_impacto?: string[];
  perguntas_discipulado?: string[];
}

export interface SermonOutline {
  id: string;
  event_id?: string | null;
  title: string;
  preacher?: string | null;
  audio_filename: string;
  media_type: "audio" | "video";
  structured_content: StructuredContent;
  created_at: string;
}

export interface SermonListItem {
  id: string;
  event_id?: string | null;
  title: string;
  preacher?: string | null;
  audio_filename: string;
  media_type: "audio" | "video";
  tema: string;
  created_at: string;
}

export interface MinistryItem {
  id: string;
  name: string;
  description?: string | null;
  kanji_symbol: string;
  kanji_meaning: string;
  badge_svg: string;
  primary_color: string;
  created_at: string;
}

export interface MinistryAISuggestion {
  name: string;
  description: string;
  kanji_symbol: string;
  kanji_meaning: string;
  biblical_reference: string;
  primary_color: string;
  badge_svg: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  theme?: string | null;
  description?: string | null;
  cover_image?: string | null;
  category?: string | null;
  capacity?: number | null;
  status?: "published" | "pending_pastor_approval" | "changes_proposed_by_pastor" | "changes_accepted_by_leader" | "cancelled" | "draft" | string | null;
  ministry_id?: string | null;
  ministry_name?: string | null;
  responsible_id?: string | null;
  responsible_name?: string | null;
  approved_by?: string | null;
  tags?: string[];
  is_global?: boolean;
  proposed_date?: string | null;
  proposed_location?: string | null;
  pastor_notes?: string | null;
  proposed_by?: string | null;
  address_details?: Record<string, any> | null;
  planning?: Record<string, any> | null;
  has_sermon: boolean;
  is_past: boolean;
  sermon?: SermonOutline | null;
  created_at: string;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PASTOR" | "LEADER" | "TEEN";
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  ministries?: { id: string; name: string }[];
  tags?: string[];
  active: boolean;
  created_at: string;
}

export interface AttendanceItem {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  status: string;
  created_at: string;
}

export interface EventAttendanceStats {
  event_id: string;
  total_confirmed: number;
  capacity?: number | null;
  spots_remaining?: number | null;
  is_full: boolean;
  attendees: AttendanceItem[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface CreateEventInput {
  title: string;
  date: string;
  location?: string;
  theme?: string;
  description?: string;
  cover_image?: string;
  address_details?: Record<string, any>;
  planning?: Record<string, any>;
  ministry_id?: string;
  tags?: string[];
  is_global?: boolean;
}

export interface ChurchSettings {
  church_name: string;
  group_singular: string;
  group_plural: string;
  available_tags: string[];
  tag_suggestions: Array<{
    id: string;
    tag: string;
    justification?: string;
    suggested_by_id: string;
    suggested_by_name: string;
    status: string;
  }>;
  updated_at?: string;
}

export interface StrategicInsightItem {
  target_id?: string;
  target_name: string;
  category: "ministry_inactivity" | "member_absence" | "leader_workload" | "encouragement" | string;
  severity: "high_concern" | "warning" | "info" | "positive";
  days_inactive?: number;
  inactivity_rate?: number;
  title: string;
  observation: string;
  temporal_analysis: string;
  probable_causes: string[];
  action_plan: string;
}

export interface StrategicInsightsResponse {
  role: string;
  user_name: string;
  summary: string;
  insights: StrategicInsightItem[];
  generated_at: string;
}

export interface InconsistencyItem {
  field: string;
  issue: string;
  suggestion: string;
  severity: "warning" | "error";
}

export interface EventAIAssistRequest {
  input_text?: string;
  current_title?: string;
  current_date?: string;
  current_location?: string;
  current_theme?: string;
  current_description?: string;
}

export interface LocationMemory {
  has_previous_location: boolean;
  previous_location_name?: string;
  previous_formatted_address?: string;
  previous_maps_url?: string;
  confirmation_prompt?: string;
  is_confirmed_from_history?: boolean;
}

export interface CEPAddressResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  formatted_address: string;
  maps_url: string;
}

export interface EventAIAssistResponse {
  suggested_title: string;
  suggested_theme: string;
  suggested_description: string;
  suggested_date?: string;
  location_data: {
    place_name?: string;
    formatted_address?: string;
    maps_url?: string;
    city?: string;
    neighborhood?: string;
    cep?: string;
  };
  location_memory?: LocationMemory;
  suggested_banner_url: string;
  banner_alternatives: string[];
  planning: {
    publico_alvo?: string;
    versiculo_base?: string;
    ordem_culto?: Array<{ etapa: string; tempo_minutos: number }>;
  };
  inconsistencies: InconsistencyItem[];
  questions: string[];
}

export interface EventInviteResponse {
  event_id: string;
  event_title: string;
  invite_text: string;
}

export interface ApiError {
  error: string;
  message: string;
  status_code: number;
}
