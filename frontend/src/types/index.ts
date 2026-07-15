export type ProjectStatus = 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectType = 'campaign' | 'promotion' | 'launch' | 'event' | 'internal' | 'partnership' | 'other';
export type Department = 'marketing' | 'cargo' | 'fidelidade' | 'viagens' | 'cargo_express' | 'tecnologia' | 'financeiro' | 'operacoes' | 'outros';
export type UserRole = 'director' | 'marketing_manager' | 'analyst' | 'developer';

export interface Project {
  id: number;
  name: string;
  description?: string;
  objective?: string;
  project_type: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  target_audience?: string;
  expected_outcome?: string;
  kpis: Record<string, any>;
  departments: Department[];
  owner_id: number;
  ai_conflict_score: number;
  ai_synergy_score: number;
  ai_priority_score: number;
  ai_summary?: string;
  ai_collaboration_index: number;
  ai_last_analyzed?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
  project_type: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string;
  end_date: string;
  budget: number;
  departments: string[];
  ai_conflict_score: number;
  ai_synergy_score: number;
  ai_collaboration_index: number;
}

export interface DashboardSummary {
  active_projects: number;
  conflicts_detected: number;
  projects_awaiting_marketing: number;
  potential_savings: number;
  projects_this_week: number;
  conflicts_this_week: number;
  high_priority_count: number;
  avg_collaboration_index: number;
}

export interface Conflict {
  id: number;
  project_id: number;
  conflict_with_id: number;
  conflict_type: string;
  similarity_score: number;
  date_overlap_days: number;
  audience_overlap_score: number;
  budget_similarity: number;
  objective_similarity: number;
  ai_recommendation?: string;
  ai_recommendation_type?: string;
  status: string;
  created_at: string;
  project?: ProjectSummary;
  conflict_with?: ProjectSummary;
}

export interface Synergy {
  id: number;
  project_id: number;
  synergy_with_id: number;
  synergy_type: string;
  synergy_score: number;
  description?: string;
  potential_savings: number;
  shared_resources: string[];
  shared_audience?: string;
  ai_recommendation?: string;
  status: string;
  created_at: string;
  project?: ProjectSummary;
  synergy_with?: ProjectSummary;
}

export interface MarketingRequest {
  id: number;
  project_id: number;
  objective: string;
  target_audience: string;
  budget: number;
  expected_deliverables?: string;
  deadline?: string;
  priority: ProjectPriority;
  status: string;
  ai_generated_briefing?: string;
  ai_suggested_team: string[];
  ai_estimated_effort?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  project_id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  color: string;
  is_conflict: boolean;
}

export interface CalendarView {
  date: string;
  events: CalendarEvent[];
  has_conflict: boolean;
  conflict_count: number;
}

export interface CollaborationIndexResponse {
  project_id: number;
  project_name: string;
  collaboration_score: number;
  collaboration_level: string;
  departments_involved: string[];
  total_departments: number;
  shared_resources: number;
  shared_budget: number;
  details: Record<string, any>;
}

export interface DepartmentResponse {
  name: string;
  display_name: string;
  description?: string;
  color: string;
  project_count: number;
}

export interface PreCheckRequest {
  name: string;
  objective: string;
  start_date: string;
  end_date: string;
  budget: number;
  target_audience?: string;
  departments: string[];
}

export interface PreCheckResponse {
  similar_projects: ProjectSummary[];
  potential_conflicts: any[];
  potential_synergies: any[];
  should_proceed: boolean;
  warning_message?: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  department: Department;
  role: UserRole | string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface AIAnalysisResponse {
  id: number;
  project_id: number;
  analysis_type: string;
  conflicts_found: number;
  synergies_found: number;
  marketing_requests_suggested: number;
  priority_suggested?: ProjectPriority;
  priority_score?: number;
  collaboration_index?: number;
  executive_summary?: string;
  conflicts: Conflict[];
  synergies: Synergy[];
  marketing_request?: MarketingRequest;
  structured_data: Record<string, any>;
  model_used: string;
  tokens_used: number;
  processing_time_ms: number;
  created_at: string;
}