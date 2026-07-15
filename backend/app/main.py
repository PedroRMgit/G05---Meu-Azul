from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import List, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.db.database import init_db, get_db
from app.models.models import (
    User, Project, Department, AIAnalysis, ProjectConflict,
    ProjectSynergy, MarketingRequest, ProjectStatus, ProjectPriority,
    DepartmentType, ProjectType, CollaborationIndex, DashboardMetrics,
    CalendarEvent
)
from app.schemas.schemas import (
    UserCreate, User as UserSchema, Token, TokenData, TestLoginCreate,
    ProjectCreate, ProjectUpdate, Project as ProjectSchema,
    ProjectSummary, ProjectConflict as ConflictSchema,
    ProjectSynergy as SynergySchema,
    MarketingRequestCreate, MarketingRequest as MarketingRequestSchema,
    AIAnalysisRequest, AIAnalysisResponse,
    DashboardMetrics as DashboardMetricsSchema,
    DashboardSummary, CalendarEvent, CalendarView,
    ProjectPreCheckRequest, ProjectPreCheckResponse,
    DepartmentResponse, DepartmentCreate,
    PrioritySuggestion, ExecutiveSummary,
    CollaborationIndexResponse, CollaborationLevel
)
from app.services.ai_agent import ANALYSIS_SYSTEM_PROMPT
from app.services.analysis_service import AIAnalysisService
from app.services.llm_provider import get_llm_provider

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    return current_user


@app.on_event("startup")
async def startup():
    init_db()
    
    db = next(get_db())
    try:
        for dept in DepartmentType:
            existing = db.query(Department).filter(Department.name == dept).first()
            if not existing:
                db.add(Department(
                    name=dept,
                    display_name=dept.value.replace("_", " ").title(),
                    color="#6366f1"
                ))
        db.commit()
    finally:
        db.close()


@app.post(f"{settings.API_V1_STR}/auth/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email já registrado")
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        department=user_in.department,
        role=user_in.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post(f"{settings.API_V1_STR}/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post(f"{settings.API_V1_STR}/auth/test-login", response_model=Token)
def test_login(test_in: TestLoginCreate, db: Session = Depends(get_db)):
    if test_in.access_key != "123":
        raise HTTPException(status_code=401, detail="Chave de acesso inválida")
    test_email = f"teste_{test_in.role}@meuazul.com"
    user = db.query(User).filter(User.email == test_email).first()
    if not user:
        user = User(
            email=test_email,
            hashed_password=get_password_hash("teste123"),
            full_name="teste",
            department=DepartmentType.OUTROS,
            role=test_in.role,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get(f"{settings.API_V1_STR}/auth/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@app.post(f"{settings.API_V1_STR}/projects", response_model=ProjectSchema)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = Project(
        **project_in.model_dump(exclude={"departments"}),
        owner_id=current_user.id
    )
    if project_in.departments:
        project.departments = db.query(Department).filter(
            Department.name.in_(project_in.departments)
        ).all()
    db.add(project)
    db.commit()
    db.refresh(project)
    
    llm = get_llm_provider(settings.LLM_PROVIDER, settings.OPENAI_API_KEY, settings.LLM_MODEL)
    ai_service = AIAnalysisService(db, llm)
    import asyncio
    asyncio.create_task(ai_service.analyze_new_project(project, db.query(Project).filter(Project.id != project.id).all(), current_user))
    
    return project


@app.get(f"{settings.API_V1_STR}/projects", response_model=List[ProjectSummary])
def list_projects(
    status: Optional[ProjectStatus] = None,
    department: Optional[DepartmentType] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Project)
    if status:
        query = query.filter(Project.status == status)
    if department:
        query = query.join(Project.departments).filter(Department.name == department)
    projects = query.offset(skip).limit(limit).all()
    return projects


@app.get(f"{settings.API_V1_STR}/projects/{{project_id}}", response_model=ProjectSchema)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project


@app.put(f"{settings.API_V1_STR}/projects/{{project_id}}", response_model=ProjectSchema)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    if project.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    update_data = project_in.model_dump(exclude_unset=True, exclude={"departments"})
    for field, value in update_data.items():
        setattr(project, field, value)
    
    if project_in.departments is not None:
        project.departments = db.query(Department).filter(
            Department.name.in_(project_in.departments)
        ).all()
    
    db.commit()
    db.refresh(project)
    return project


@app.delete(f"{settings.API_V1_STR}/projects/{{project_id}}")
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    if project.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Sem permissão")
    db.delete(project)
    db.commit()
    return {"message": "Projeto removido"}


@app.post(f"{settings.API_V1_STR}/projects/{{project_id}}/analyze", response_model=AIAnalysisResponse)
async def analyze_project(
    project_id: int,
    request: AIAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    existing = db.query(Project).filter(Project.id != project_id).all()
    
    llm = get_llm_provider(settings.LLM_PROVIDER, settings.OPENAI_API_KEY, settings.LLM_MODEL)
    ai_service = AIAnalysisService(db, llm)
    analysis = await ai_service.analyze_new_project(project, existing, current_user)
    
    return analysis


@app.post(f"{settings.API_V1_STR}/projects/pre-check", response_model=ProjectPreCheckResponse)
async def pre_check_project(
    request: ProjectPreCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    existing = db.query(Project).filter(
        and_(
            Project.status.in_([ProjectStatus.DRAFT, ProjectStatus.PLANNING, ProjectStatus.ACTIVE]),
            or_(
                Project.start_date <= request.end_date,
                Project.end_date >= request.start_date
            )
        )
    ).limit(10).all()
    
    llm = get_llm_provider(settings.LLM_PROVIDER, settings.OPENAI_API_KEY, settings.LLM_MODEL)
    ai_service = AIAnalysisService(db, llm)
    
    temp_project = Project(
        name=request.name,
        objective=request.objective,
        start_date=request.start_date,
        end_date=request.end_date,
        budget=request.budget,
        target_audience=request.target_audience,
        owner_id=current_user.id
    )
    
    analysis = await ai_service.analyze_new_project(temp_project, existing, current_user)
    
    similar = []
    for p in existing:
        similar.append(ProjectSummary(
            id=p.id,
            name=p.name,
            project_type=p.project_type,
            status=p.status,
            priority=p.priority,
            start_date=p.start_date,
            end_date=p.end_date,
            budget=p.budget,
            departments=[d.name for d in p.departments],
            ai_conflict_score=p.ai_conflict_score,
            ai_synergy_score=p.ai_synergy_score,
            ai_collaboration_index=p.ai_collaboration_index
        ))
    
    return ProjectPreCheckResponse(
        similar_projects=similar[:3],
        potential_conflicts=analysis.structured_data.get("conflicts", []),
        potential_synergies=analysis.structured_data.get("synergies", []),
        should_proceed=len(analysis.structured_data.get("conflicts", [])) == 0,
        warning_message="Conflitos detectados - revise antes de prosseguir" if analysis.structured_data.get("conflicts") else None
    )


@app.get(f"{settings.API_V1_STR}/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy import func
    from datetime import timedelta
    
    week_ago = date.today() - timedelta(days=7)
    
    active = db.query(func.count(Project.id)).filter(Project.status == ProjectStatus.ACTIVE).scalar() or 0
    conflicts = db.query(func.count(ProjectConflict.id)).filter(ProjectConflict.status == "detected").scalar() or 0
    marketing_pending = db.query(func.count(MarketingRequest.id)).filter(MarketingRequest.status == "pending").scalar() or 0
    
    potential_savings = db.query(func.sum(ProjectSynergy.potential_savings)).scalar() or 0
    
    week_projects = db.query(func.count(Project.id)).filter(Project.created_at >= week_ago).scalar() or 0
    week_conflicts = db.query(func.count(ProjectConflict.id)).filter(ProjectConflict.created_at >= week_ago).scalar() or 0
    
    high_priority = db.query(func.count(Project.id)).filter(Project.priority.in_([ProjectPriority.HIGH, ProjectPriority.CRITICAL])).scalar() or 0
    
    avg_collab = db.query(func.avg(Project.ai_collaboration_index)).scalar() or 0
    
    return DashboardSummary(
        active_projects=active,
        conflicts_detected=conflicts,
        projects_awaiting_marketing=marketing_pending,
        potential_savings=potential_savings,
        projects_this_week=week_projects,
        conflicts_this_week=week_conflicts,
        high_priority_count=high_priority,
        avg_collaboration_index=avg_collab
    )


@app.get(f"{settings.API_V1_STR}/dashboard/metrics", response_model=List[DashboardMetricsSchema])
def get_dashboard_metrics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from datetime import timedelta
    start = date.today() - timedelta(days=days)
    return db.query(DashboardMetrics).filter(DashboardMetrics.date >= start).order_by(DashboardMetrics.date).all()


@app.get(f"{settings.API_V1_STR}/calendar", response_model=List[CalendarView])
def get_calendar(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    projects = db.query(Project).filter(
        and_(Project.start_date <= end_date, Project.end_date >= start_date)
    ).all()
    
    events_by_date = {}
    for p in projects:
        for d in range((p.start_date - start_date).days, (p.end_date - start_date).days + 1):
            current = start_date + timedelta(days=d)
            if current < start_date or current > end_date:
                continue
            if current not in events_by_date:
                events_by_date[current] = []
            events_by_date[current].append(CalendarEvent(
                project_id=p.id,
                title=p.name,
                description=p.objective,
                start_date=p.start_date,
                end_date=p.end_date,
                color=next((dept.color for dept in p.departments), "#6366f1"),
                is_conflict=p.ai_conflict_score > 0.7
            ))
    
    result = []
    for d, events in sorted(events_by_date.items()):
        result.append(CalendarView(
            date=d,
            events=events,
            has_conflict=any(e.is_conflict for e in events),
            conflict_count=sum(1 for e in events if e.is_conflict)
        ))
    return result


@app.post(f"{settings.API_V1_STR}/marketing-requests", response_model=MarketingRequestSchema)
def create_marketing_request(
    request: MarketingRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    mr = MarketingRequest(
        **request.model_dump(),
        requester_id=current_user.id
    )
    db.add(mr)
    db.commit()
    db.refresh(mr)
    return mr


@app.get(f"{settings.API_V1_STR}/marketing-requests", response_model=List[MarketingRequestSchema])
def list_marketing_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(MarketingRequest)
    if status:
        query = query.filter(MarketingRequest.status == status)
    return query.all()


@app.get(f"{settings.API_V1_STR}/departments", response_model=List[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).all()
    result = []
    for d in depts:
        result.append(DepartmentResponse(
            name=d.name,
            display_name=d.display_name,
            description=d.description,
            color=d.color,
            project_count=len(d.projects)
        ))
    return result


@app.post(f"{settings.API_V1_STR}/departments", response_model=DepartmentResponse)
def create_department(
    dept: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Apenas administradores")
    new_dept = Department(**dept.model_dump())
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return DepartmentResponse(
        name=new_dept.name,
        display_name=new_dept.display_name,
        description=new_dept.description,
        color=new_dept.color,
        project_count=0
    )


@app.get(f"{settings.API_V1_STR}/projects/{{project_id}}/collaboration-index", response_model=CollaborationIndexResponse)
def get_collaboration_index(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    depts = [d.value for d in project.departments]
    score = project.ai_collaboration_index or 0
    
    if score >= 75:
        level = CollaborationLevel.EXCELLENT
    elif score >= 50:
        level = CollaborationLevel.HIGH
    elif score >= 25:
        level = CollaborationLevel.MEDIUM
    else:
        level = CollaborationLevel.LOW
    
    return CollaborationIndexResponse(
        project_id=project.id,
        project_name=project.name,
        collaboration_score=score,
        collaboration_level=level,
        departments_involved=depts,
        total_departments=len(depts),
        shared_resources=0,
        shared_budget=0,
        details={}
    )


@app.get(f"{settings.API_V1_STR}/projects/{{project_id}}/conflicts", response_model=List[ConflictSchema])
def get_project_conflicts(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project.conflicts


@app.get(f"{settings.API_V1_STR}/projects/{{project_id}}/synergies", response_model=List[SynergySchema])
def get_project_synergies(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project.synergies