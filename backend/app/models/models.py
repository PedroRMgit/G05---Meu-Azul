from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, Enum as SQLEnum, Float, Boolean, JSON, Table
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProjectPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DepartmentType(str, enum.Enum):
    MARKETING = "marketing"
    CARGO = "cargo"
    FIDELIDADE = "fidelidade"
    VIAGENS = "viagens"
    CARGO_EXPRESS = "cargo_express"
    TECNOLOGIA = "tecnologia"
    FINANCEIRO = "financeiro"
    OPERACOES = "operacoes"
    OUTROS = "outros"


class ProjectType(str, enum.Enum):
    CAMPAIGN = "campaign"
    PROMOTION = "promotion"
    LAUNCH = "launch"
    EVENT = "event"
    INTERNAL = "internal"
    PARTNERSHIP = "partnership"
    OTHER = "other"


project_departments = Table(
    "project_departments",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    department = Column(SQLEnum(DepartmentType), nullable=False)
    role = Column(String(100), default="user")
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    projects = relationship("Project", back_populates="owner")
    marketing_requests = relationship("MarketingRequest", back_populates="requester")
    ai_analyses = relationship("AIAnalysis", back_populates="requested_by")


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    objective = Column(Text)
    project_type = Column(SQLEnum(ProjectType), default=ProjectType.OTHER)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.DRAFT)
    priority = Column(SQLEnum(ProjectPriority), default=ProjectPriority.MEDIUM)
    
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    
    budget = Column(Float, default=0.0)
    currency = Column(String(3), default="BRL")
    
    target_audience = Column(Text)
    expected_outcome = Column(Text)
    kpis = Column(JSON, default=dict)
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    ai_conflict_score = Column(Float, default=0.0)
    ai_synergy_score = Column(Float, default=0.0)
    ai_priority_score = Column(Float, default=0.0)
    ai_summary = Column(Text)
    ai_collaboration_index = Column(Float, default=0.0)
    ai_last_analyzed = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    owner = relationship("User", back_populates="projects")
    departments = relationship("Department", secondary=project_departments, back_populates="projects")
    ai_analyses = relationship("AIAnalysis", back_populates="project")
    conflicts = relationship("ProjectConflict", foreign_keys="ProjectConflict.project_id", back_populates="project")
    conflicts_with = relationship("ProjectConflict", foreign_keys="ProjectConflict.conflict_with_id", back_populates="conflict_with")
    synergies = relationship("ProjectSynergy", foreign_keys="ProjectSynergy.project_id", back_populates="project")
    synergies_with = relationship("ProjectSynergy", foreign_keys="ProjectSynergy.synergy_with_id", back_populates="synergy_with")
    marketing_requests = relationship("MarketingRequest", back_populates="project")


class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(SQLEnum(DepartmentType), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#6366f1")
    
    projects = relationship("Project", secondary=project_departments, back_populates="departments")


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    analysis_type = Column(String(50), nullable=False)
    prompt = Column(Text)
    response = Column(Text)
    structured_data = Column(JSON, default=dict)
    
    conflicts_found = Column(Integer, default=0)
    synergies_found = Column(Integer, default=0)
    marketing_requests_suggested = Column(Integer, default=0)
    priority_suggested = Column(SQLEnum(ProjectPriority))
    priority_score = Column(Float)
    collaboration_index = Column(Float)
    executive_summary = Column(Text)
    
    model_used = Column(String(100))
    tokens_used = Column(Integer)
    processing_time_ms = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="ai_analyses")
    requested_by = relationship("User", back_populates="ai_analyses")


class ProjectConflict(Base):
    __tablename__ = "project_conflicts"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    conflict_with_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    
    conflict_type = Column(String(50), nullable=False)
    similarity_score = Column(Float, nullable=False)
    date_overlap_days = Column(Integer, default=0)
    audience_overlap_score = Column(Float, default=0.0)
    budget_similarity = Column(Float, default=0.0)
    objective_similarity = Column(Float, default=0.0)
    
    ai_recommendation = Column(Text)
    ai_recommendation_type = Column(String(50))
    status = Column(String(20), default="detected")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    project = relationship("Project", foreign_keys=[project_id], back_populates="conflicts")
    conflict_with = relationship("Project", foreign_keys=[conflict_with_id], back_populates="conflicts_with")


class ProjectSynergy(Base):
    __tablename__ = "project_synergies"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    synergy_with_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    
    synergy_type = Column(String(50), nullable=False)
    synergy_score = Column(Float, nullable=False)
    description = Column(Text)
    potential_savings = Column(Float, default=0.0)
    shared_resources = Column(JSON, default=list)
    shared_audience = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", foreign_keys=[project_id], back_populates="synergies")
    synergy_with = relationship("Project", foreign_keys=[synergy_with_id], back_populates="synergies_with")


class MarketingRequest(Base):
    __tablename__ = "marketing_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    objective = Column(Text, nullable=False)
    target_audience = Column(Text)
    budget = Column(Float)
    expected_deliverables = Column(JSON, default=list)
    timeline = Column(String(100))
    priority = Column(SQLEnum(ProjectPriority), default=ProjectPriority.MEDIUM)
    status = Column(String(20), default="pending")
    
    ai_generated_briefing = Column(Text)
    ai_suggested_team = Column(JSON, default=list)
    ai_estimated_effort = Column(String(100))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    project = relationship("Project", back_populates="marketing_requests")
    requester = relationship("User", back_populates="marketing_requests")


class CollaborationIndex(Base):
    __tablename__ = "collaboration_indexes"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), unique=True, nullable=False)
    
    total_departments = Column(Integer, default=1)
    departments_involved = Column(JSON, default=list)
    cross_department_meetings = Column(Integer, default=0)
    shared_resources_count = Column(Integer, default=0)
    joint_meetings_count = Column(Integer, default=0)
    shared_budget = Column(Float, default=0.0)
    collaboration_score = Column(Float, default=0.0)
    collaboration_level = Column(String(20), default="low")
    
    calculated_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project")


class DashboardMetrics(Base):
    __tablename__ = "dashboard_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    
    active_projects = Column(Integer, default=0)
    total_projects = Column(Integer, default=0)
    conflicts_detected = Column(Integer, default=0)
    conflicts_resolved = Column(Integer, default=0)
    marketing_requests_pending = Column(Integer, default=0)
    marketing_requests_completed = Column(Integer, default=0)
    potential_savings = Column(Float, default=0.0)
    avg_collaboration_index = Column(Float, default=0.0)
    high_priority_projects = Column(Integer, default=0)
    projects_awaiting_marketing = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    color = Column(String(7), default="#6366f1")
    is_milestone = Column(Boolean, default=False)
    is_conflict = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project")