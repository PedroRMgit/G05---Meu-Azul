from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
from decimal import Decimal


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProjectPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Department(str, Enum):
    MARKETING = "marketing"
    CARGO = "cargo"
    FIDELIDADE = "fidelidade"
    VIAGENS = "viagens"
    CARGO_EXPRESS = "cargo_express"
    TECNOLOGIA = "tecnologia"
    FINANCEIRO = "financeiro"
    OPERACOES = "operacoes"
    OUTROS = "outros"


class ProjectType(str, Enum):
    CAMPAIGN = "campaign"
    PROMOTION = "promotion"
    LAUNCH = "launch"
    EVENT = "event"
    INTERNAL = "internal"
    PARTNERSHIP = "partnership"
    OTHER = "other"


class ConflictType(str, Enum):
    DATE_OVERLAP = "date_overlap"
    AUDIENCE_OVERLAP = "audience_overlap"
    BUDGET_SIMILARITY = "budget_similarity"
    OBJECTIVE_SIMILARITY = "objective_similarity"
    DUPLICATE_PROJECT = "duplicate_project"


class SynergyType(str, Enum):
    SHARED_AUDIENCE = "shared_audience"
    SHARED_BUDGET = "shared_budget"
    SHARED_RESOURCES = "shared_resources"
    COMPLEMENTARY_OBJECTIVES = "complementary_objectives"
    CROSS_PROMOTION = "cross_promotion"
    SHARED_MARKETING = "shared_marketing"


class MarketingRequestStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"


class CollaborationLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXCELLENT = "excellent"


class ConflictStatus(str, Enum):
    DETECTED = "detected"
    REVIEWING = "reviewing"
    RESOLVED = "resolved"
    IGNORED = "ignored"


class SynergyStatus(str, Enum):
    SUGGESTED = "suggested"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    department: Department
    role: str = "user"


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[Department] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    objective: Optional[str] = None
    project_type: ProjectType = ProjectType.OTHER
    status: ProjectStatus = ProjectStatus.DRAFT
    priority: ProjectPriority = ProjectPriority.MEDIUM
    start_date: date
    end_date: date
    budget: float = 0.0
    currency: str = "BRL"
    target_audience: Optional[str] = None
    expected_outcome: Optional[str] = None
    kpis: Dict[str, Any] = {}
    departments: List[str] = []


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    objective: Optional[str] = None
    project_type: Optional[ProjectType] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    currency: Optional[str] = None
    target_audience: Optional[str] = None
    expected_outcome: Optional[str] = None
    kpis: Optional[Dict[str, Any]] = None
    departments: Optional[List[str]] = None


class Project(ProjectBase):
    id: int
    owner_id: int
    owner: Optional[User] = None
    
    ai_conflict_score: float = 0.0
    ai_synergy_score: float = 0.0
    ai_priority_score: float = 0.0
    ai_summary: Optional[str] = None
    ai_collaboration_index: float = 0.0
    ai_last_analyzed: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    
    departments: List[Department] = []
    conflicts: List['ProjectConflict'] = []
    synergies: List['ProjectSynergy'] = []
    marketing_requests: List['MarketingRequest'] = []
    
    class Config:
        from_attributes = True


class ProjectSummary(BaseModel):
    id: int
    name: str
    project_type: ProjectType
    status: ProjectStatus
    priority: ProjectPriority
    start_date: date
    end_date: date
    budget: float
    departments: List[str] = []
    ai_conflict_score: float
    ai_synergy_score: float
    ai_collaboration_index: float
    
    class Config:
        from_attributes = True


class ProjectConflictBase(BaseModel):
    project_id: int
    conflict_with_id: int
    conflict_type: ConflictType
    similarity_score: float = Field(..., ge=0, le=1)
    date_overlap_days: int = 0
    audience_overlap_score: float = 0.0
    budget_similarity: float = 0.0
    objective_similarity: float = 0.0
    ai_recommendation: Optional[str] = None
    ai_recommendation_type: Optional[str] = None
    status: ConflictStatus = ConflictStatus.DETECTED


class ProjectConflictCreate(ProjectConflictBase):
    pass


class ProjectConflict(ProjectConflictBase):
    id: int
    project: Optional[ProjectSummary] = None
    conflict_with: Optional[ProjectSummary] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ProjectSynergyBase(BaseModel):
    project_id: int
    synergy_with_id: int
    synergy_type: SynergyType
    synergy_score: float = Field(..., ge=0, le=1)
    description: Optional[str] = None
    potential_savings: float = 0.0
    shared_resources: List[str] = []
    shared_audience: Optional[str] = None
    ai_recommendation: Optional[str] = None
    status: SynergyStatus = SynergyStatus.SUGGESTED


class ProjectSynergyCreate(ProjectSynergyBase):
    pass


class ProjectSynergy(ProjectSynergyBase):
    id: int
    project: Optional[ProjectSummary] = None
    synergy_with: Optional[ProjectSummary] = None
    created_at: datetime
    accepted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MarketingRequestBase(BaseModel):
    project_id: int
    objective: str
    target_audience: str
    budget: float = 0.0
    expected_deliverables: Optional[str] = None
    deadline: Optional[date] = None
    priority: ProjectPriority = ProjectPriority.MEDIUM


class MarketingRequestCreate(MarketingRequestBase):
    pass


class MarketingRequestUpdate(BaseModel):
    objective: Optional[str] = None
    target_audience: Optional[str] = None
    budget: Optional[float] = None
    expected_deliverables: Optional[str] = None
    deadline: Optional[date] = None
    priority: Optional[ProjectPriority] = None
    status: Optional[MarketingRequestStatus] = None
    marketing_response: Optional[str] = None


class MarketingRequest(MarketingRequestBase):
    id: int
    requester_id: int
    requester: Optional[User] = None
    assigned_to_id: Optional[int] = None
    assigned_to: Optional[User] = None
    
    ai_generated_brief: Optional[str] = None
    ai_suggested_priority: Optional[ProjectPriority] = None
    ai_estimated_effort: Optional[str] = None
    ai_suggested_team: List[str] = []
    
    status: MarketingRequestStatus = MarketingRequestStatus.PENDING
    marketing_response: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    responded_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AIAnalysisRequest(BaseModel):
    project_id: int
    analysis_type: str = "full_analysis"
    include_conflicts: bool = True
    include_synergies: bool = True
    include_priority: bool = True
    include_collaboration_index: bool = True
    include_executive_summary: bool = True
    include_marketing_request: bool = True


class AIAnalysisResponse(BaseModel):
    id: int
    project_id: int
    analysis_type: str
    conflicts_found: int
    synergies_found: int
    marketing_requests_suggested: int
    priority_suggested: Optional[ProjectPriority] = None
    priority_score: Optional[float] = None
    collaboration_index: Optional[float] = None
    executive_summary: Optional[str] = None
    conflicts: List[ProjectConflict] = []
    synergies: List[ProjectSynergy] = []
    marketing_request: Optional[MarketingRequest] = None
    structured_data: Dict[str, Any] = {}
    model_used: str
    tokens_used: int
    processing_time_ms: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class CollaborationIndexBase(BaseModel):
    project_id: int
    total_departments: int = 1
    departments_involved: List[str] = []
    cross_department_meetings: int = 0
    shared_resources_count: int = 0
    joint_meetings_count: int = 0
    shared_budget: float = 0.0


class CollaborationIndexCreate(CollaborationIndexBase):
    pass


class CollaborationIndex(CollaborationIndexBase):
    id: int
    collaboration_score: float = 0.0
    collaboration_level: CollaborationLevel = CollaborationLevel.LOW
    calculated_at: datetime
    
    class Config:
        from_attributes = True


class DashboardMetricsBase(BaseModel):
    date: date
    active_projects: int = 0
    total_projects: int = 0
    conflicts_detected: int = 0
    conflicts_resolved: int = 0
    marketing_requests_pending: int = 0
    marketing_requests_completed: int = 0
    potential_savings: float = 0.0
    avg_collaboration_index: float = 0.0
    high_priority_projects: int = 0
    projects_awaiting_marketing: int = 0


class DashboardMetrics(DashboardMetricsBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CalendarEventBase(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    color: str = "#6366f1"
    is_milestone: bool = False
    is_conflict: bool = False


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEvent(CalendarEventBase):
    id: int
    project: Optional[ProjectSummary] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class CalendarView(BaseModel):
    date: date
    events: List[CalendarEvent]
    has_conflict: bool = False
    conflict_count: int = 0


class AIAnalysisRequestBody(BaseModel):
    project_data: ProjectCreate
    existing_projects: List[ProjectSummary] = []


class AIAnalysisResult(BaseModel):
    conflicts: List[Dict[str, Any]] = []
    synergies: List[Dict[str, Any]] = []
    priority_suggestion: Dict[str, Any] = {}
    collaboration_index: Dict[str, Any] = {}
    executive_summary: str = ""
    marketing_request_suggestion: Optional[Dict[str, Any]] = None
    structured_data: Dict[str, Any] = {}


class DashboardSummary(BaseModel):
    active_projects: int
    conflicts_detected: int
    projects_awaiting_marketing: int
    potential_savings: float
    projects_this_week: int
    conflicts_this_week: int
    high_priority_count: int
    avg_collaboration_index: float


class ProjectPreCheckRequest(BaseModel):
    name: str
    objective: str
    start_date: date
    end_date: date
    budget: float
    target_audience: Optional[str] = None
    departments: List[str] = []


class ProjectPreCheckResponse(BaseModel):
    similar_projects: List[ProjectSummary] = []
    potential_conflicts: List[Dict[str, Any]] = []
    potential_synergies: List[Dict[str, Any]] = []
    should_proceed: bool = True
    warning_message: Optional[str] = None


class DepartmentResponse(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    color: str
    project_count: int = 0
    
    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    color: str = "#6366f1"


class DepartmentUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class PrioritySuggestion(BaseModel):
    priority: ProjectPriority
    score: float
    reasoning: str
    factors: Dict[str, float]


class ExecutiveSummary(BaseModel):
    period: str
    total_projects: int
    conflicts_detected: int
    synergies_identified: int
    marketing_requests: int
    potential_savings: float
    top_priority_projects: List[ProjectSummary] = []
    key_insights: List[str] = []


class CollaborationIndexResponse(BaseModel):
    project_id: int
    project_name: str
    collaboration_score: float
    collaboration_level: CollaborationLevel
    departments_involved: List[str]
    total_departments: int
    shared_resources: int
    shared_budget: float
    details: Dict[str, Any]