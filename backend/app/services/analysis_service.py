import json
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.services.ai_agent import (
    get_llm_provider, ANALYSIS_SYSTEM_PROMPT,
    CONFLICT_DETECTION_PROMPT, SYNERGY_DETECTION_PROMPT,
    PRIORITY_ASSESSMENT_PROMPT, COLLABORATION_INDEX_PROMPT,
    EXECUTIVE_SUMMARY_PROMPT, MARKETING_REQUEST_PROMPT,
    PRE_CHECK_PROMPT, LLMProvider
)
from app.models.models import (
    Project, ProjectConflict, ProjectSynergy, AIAnalysis,
    User, ProjectStatus, ProjectPriority, Department
)
from app.schemas.schemas import (
    ProjectPreCheckRequest, ProjectPreCheckResponse,
    ProjectSummary, PrioritySuggestion,
    ExecutiveSummary, CollaborationIndexResponse,
    CollaborationLevel
)


class AIAnalysisService:
    def __init__(self, db: Session, llm_provider: LLMProvider):
        self.db = db
        self.llm = llm_provider
    
    def _serialize_project(self, project: Project) -> Dict[str, Any]:
        depts = [d.value if hasattr(d, 'value') else str(d) for d in project.departments]
        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "objective": project.objective,
            "project_type": project.project_type.value if project.project_type else None,
            "status": project.status.value if project.status else None,
            "priority": project.priority.value if project.priority else None,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "budget": project.budget,
            "currency": project.currency,
            "target_audience": project.target_audience,
            "expected_outcome": project.expected_outcome,
            "kpis": project.kpis or {},
            "departments": depts,
            "owner_id": project.owner_id
        }
    
    async def analyze_new_project(
        self,
        project: Project,
        existing_projects: List[Project],
        requested_by: User
    ) -> AIAnalysis:
        start_time = __import__('time').time()
        
        new_project_data = self._serialize_project(project)
        existing_data = [self._serialize_project(p) for p in existing_projects]
        
        prompt = f"""NOVO PROJETO:
{json.dumps(new_project_data, ensure_ascii=False, indent=2)}

PROJETOS EXISTENTES ({len(existing_data)} projetos):
{json.dumps(existing_data, ensure_ascii=False, indent=2)}

{CONFLICT_DETECTION_PROMPT}

{SYNERGY_DETECTION_PROMPT}

{PRIORITY_ASSESSMENT_PROMPT}

{COLLABORATION_INDEX_PROMPT}

Retorne JSON com:
{{
  "conflicts": [...],
  "synergies": [...],
  "priority": {{"priority": "...", "score": 0.0, "reasoning": "...", "factors": {{}}}},
  "collaboration_index": {{"score": 0.0, "level": "...", "details": {{}}}},
  "executive_summary": "...",
  "marketing_request": {{...}}
}}"""
        
        schema = {
            "type": "object",
            "properties": {
                "conflicts": {"type": "array", "items": {"type": "object"}},
                "synergies": {"type": "array", "items": {"type": "object"}},
                "priority": {"type": "object"},
                "collaboration_index": {"type": "object"},
                "executive_summary": {"type": "string"},
                "marketing_request": {"type": "object"}
            },
            "required": ["conflicts", "synergies", "priority", "collaboration_index", "executive_summary"]
        }
        
        result = await self.llm.complete_structured(prompt, schema, ANALYSIS_SYSTEM_PROMPT)
        
        elapsed_ms = int((__import__('time').time() - start_time) * 1000)
        
        analysis = AIAnalysis(
            project_id=project.id,
            requested_by_id=requested_by.id,
            analysis_type="full_analysis",
            prompt=prompt,
            response=json.dumps(result, ensure_ascii=False),
            structured_data=result,
            conflicts_found=len(result.get("conflicts", [])),
            synergies_found=len(result.get("synergies", [])),
            priority_suggested=ProjectPriority(result.get("priority", {}).get("priority", "medium")),
            priority_score=result.get("priority", {}).get("score", 0.5),
            collaboration_index=result.get("collaboration_index", {}).get("score", 0),
            executive_summary=result.get("executive_summary", ""),
            model_used=self.llm.model,
            tokens_used=result.get("_meta", {}).get("tokens_used", 0),
            processing_time_ms=elapsed_ms
        )
        
        self.db.add(analysis)
        
        project.ai_conflict_score = len(result.get("conflicts", [])) * 0.1
        project.ai_synergy_score = len(result.get("synergies", [])) * 0.1
        project.ai_priority_score = result.get("priority", {}).get("score", 0.5)
        project.ai_collaboration_index = result.get("collaboration_index", {}).get("score", 0)
        project.ai_summary = result.get("executive_summary", "")
        project.ai_last_analyzed = datetime.utcnow()
        
        await self._save_conflicts(project, result.get("conflicts", []))
        await self._save_synergies(project, result.get("synergies", []))
        
        self.db.commit()
        self.db.refresh(analysis)
        
        return analysis
    
    async def _save_conflicts(self, project: Project, conflicts: List[Dict]):
        for conflict in conflicts:
            conflict_with_id = conflict.get("project_id") or conflict.get("conflict_with_id")
            if not conflict_with_id:
                continue
            
            existing = self.db.query(ProjectConflict).filter(
                and_(
                    ProjectConflict.project_id == project.id,
                    ProjectConflict.conflict_with_id == conflict_with_id
                )
            ).first()
            
            if existing:
                existing.similarity_score = conflict.get("similarity_score", 0)
                existing.conflict_type = conflict.get("conflict_type", "unknown")
                existing.ai_recommendation = conflict.get("recommendation", "")
                existing.ai_recommendation_type = conflict.get("recommendation_type", "")
                existing.status = "detected"
            else:
                new_conflict = ProjectConflict(
                    project_id=project.id,
                    conflict_with_id=conflict_with_id,
                    conflict_type=conflict.get("conflict_type", "unknown"),
                    similarity_score=conflict.get("similarity_score", 0),
                    date_overlap_days=conflict.get("date_overlap_days", 0),
                    audience_overlap_score=conflict.get("audience_overlap_score", 0),
                    budget_similarity=conflict.get("budget_similarity", 0),
                    objective_similarity=conflict.get("objective_similarity", 0),
                    ai_recommendation=conflict.get("recommendation", ""),
                    ai_recommendation_type=conflict.get("recommendation_type", ""),
                    status="detected"
                )
                self.db.add(new_conflict)
    
    async def _save_synergies(self, project: Project, synergies: List[Dict]):
        for synergy in synergies:
            synergy_with_id = synergy.get("project_id") or synergy.get("synergy_with_id")
            if not synergy_with_id:
                continue
            
            existing = self.db.query(ProjectSynergy).filter(
                and_(
                    ProjectSynergy.project_id == project.id,
                    ProjectSynergy.synergy_with_id == synergy_with_id
                )
            ).first()
            
            if existing:
                existing.synergy_score = synergy.get("synergy_score", 0)
                existing.synergy_type = synergy.get("synergy_type", "unknown")
                existing.description = synergy.get("description", "")
                existing.potential_savings = synergy.get("potential_savings", 0)
                existing.shared_resources = synergy.get("shared_resources", [])
                existing.shared_audience = synergy.get("shared_audience", False)
            else:
                new_synergy = ProjectSynergy(
                    project_id=project.id,
                    synergy_with_id=synergy_with_id,
                    synergy_type=synergy.get("synergy_type", "unknown"),
                    synergy_score=synergy.get("synergy_score", 0),
                    description=synergy.get("description", ""),
                    potential_savings=synergy.get("potential_savings", 0),
                    shared_resources=synergy.get("shared_resources", []),
                    shared_audience=synergy.get("shared_audience", False)
                )
                self.db.add(new_synergy)
    
    async def pre_check_project(self, request: ProjectPreCheckRequest) -> ProjectPreCheckResponse:
        existing_projects = self.db.query(Project).filter(
            Project.status.in_([ProjectStatus.DRAFT, ProjectStatus.PLANNING, ProjectStatus.ACTIVE])
        ).limit(20).all()
        
        existing_data = [self._serialize_project(p) for p in existing_projects]
        new_project_data = request.model_dump()
        new_project_data["start_date"] = new_project_data["start_date"].isoformat()
        new_project_data["end_date"] = new_project_data["end_date"].isoformat()
        new_project_data["departments"] = [d.value for d in new_project_data["departments"]]
        
        prompt = f"""NOVO PROJETO (PRÉ-CADASTRO):
{json.dumps(new_project_data, ensure_ascii=False, indent=2)}

PROJETOS EXISTENTES ATIVOS ({len(existing_data)}):
{json.dumps(existing_data, ensure_ascii=False, indent=2)}

{PRE_CHECK_PROMPT}

Retorne JSON:
{{
  "similar_projects": [...],
  "potential_conflicts": [...],
  "potential_synergies": [...],
  "should_proceed": true/false,
  "warning_message": "..."
}}"""
        
        schema = {
            "type": "object",
            "properties": {
                "similar_projects": {"type": "array", "items": {"type": "object"}},
                "potential_conflicts": {"type": "array", "items": {"type": "object"}},
                "potential_synergies": {"type": "array", "items": {"type": "object"}},
                "should_proceed": {"type": "boolean"},
                "warning_message": {"type": "string"}
            },
            "required": ["similar_projects", "potential_conflicts", "potential_synergies", "should_proceed"]
        }
        
        result = await self.llm.complete_structured(prompt, schema, ANALYSIS_SYSTEM_PROMPT)
        
        similar_projects = [
            ProjectSummary(
                id=p.get("id", 0),
                name=p.get("name", ""),
                status=p.get("status", "draft"),
                priority=p.get("priority", "medium"),
                start_date=date.fromisoformat(p["start_date"]) if p.get("start_date") else date.today(),
                end_date=date.fromisoformat(p["end_date"]) if p.get("end_date") else date.today(),
                departments=p.get("departments", []),
                budget=p.get("budget", 0),
                ai_conflict_score=p.get("ai_conflict_score", 0),
                ai_synergy_score=p.get("ai_synergy_score", 0),
                ai_collaboration_index=p.get("ai_collaboration_index", 0)
            )
            for p in result.get("similar_projects", [])
        ]
        
        return ProjectPreCheckResponse(
            similar_projects=similar_projects,
            potential_conflicts=result.get("potential_conflicts", []),
            potential_synergies=result.get("potential_synergies", []),
            should_proceed=result.get("should_proceed", True),
            warning_message=result.get("warning_message")
        )
    
    async def generate_executive_summary(self, period_days: int = 7) -> ExecutiveSummary:
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=period_days)
        
        recent_projects = self.db.query(Project).filter(Project.created_at >= cutoff).all()
        conflicts = self.db.query(ProjectConflict).filter(ProjectConflict.created_at >= cutoff).all()
        synergies = self.db.query(ProjectSynergy).filter(ProjectSynergy.created_at >= cutoff).all()
        
        prompt = f"""Dados da última semana ({period_days} dias):
- Projetos criados: {len(recent_projects)}
- Conflitos detectados: {len(conflicts)}
- Sinergias identificadas: {len(synergies)}
- Projetos aguardando marketing: {self.db.query(Project).filter(Project.status == ProjectStatus.PLANNING).count()}
- Economia potencial: R$ {sum(s.potential_savings for s in synergies):,.2f}

Projetos:
{json.dumps([self._serialize_project(p) for p in recent_projects], ensure_ascii=False, indent=2)}

{EXECUTIVE_SUMMARY_PROMPT}

Retorne JSON:
{{
  "period": "...",
  "total_projects": 0,
  "conflicts_detected": 0,
  "synergies_identified": 0,
  "marketing_requests": 0,
  "potential_savings": 0.0,
  "top_priority_projects": [...],
  "key_insights": [...]
}}"""
        
        schema = {
            "type": "object",
            "properties": {
                "period": {"type": "string"},
                "total_projects": {"type": "integer"},
                "conflicts_detected": {"type": "integer"},
                "synergies_identified": {"type": "integer"},
                "marketing_requests": {"type": "integer"},
                "potential_savings": {"type": "number"},
                "top_priority_projects": {"type": "array", "items": {"type": "object"}},
                "key_insights": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["period", "total_projects", "conflicts_detected", "synergies_identified"]
        }
        
        result = await self.llm.complete_structured(prompt, schema, ANALYSIS_SYSTEM_PROMPT)
        
        return ExecutiveSummary(**result)
    
    async def get_collaboration_index(self, project_id: int) -> CollaborationIndexResponse:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Projeto não encontrado")
        
        depts = [d.value if hasattr(d, 'value') else str(d) for d in project.departments]
        
        prompt = f"""Projeto: {project.name}
Áreas envolvidas: {depts}
Objetivo: {project.objective}
Orçamento: R$ {project.budget:,.2f}

{COLLABORATION_INDEX_PROMPT}

Retorne JSON com score, level, details."""
        
        schema = {
            "type": "object",
            "properties": {
                "score": {"type": "number"},
                "level": {"type": "string"},
                "details": {"type": "object"}
            },
            "required": ["score", "level"]
        }
        
        result = await self.llm.complete_structured(prompt, schema, ANALYSIS_SYSTEM_PROMPT)
        
        score = result.get("score", 0)
        if score <= 25:
            level = CollaborationLevel.LOW
        elif score <= 50:
            level = CollaborationLevel.MEDIUM
        elif score <= 75:
            level = CollaborationLevel.HIGH
        else:
            level = CollaborationLevel.EXCELLENT
        
        return CollaborationIndexResponse(
            project_id=project.id,
            project_name=project.name,
            collaboration_score=score,
            collaboration_level=level,
            departments_involved=depts,
            total_departments=len(depts),
            shared_resources=0,
            shared_budget=0.0,
            details=result.get("details", {})
        )
    
    async def generate_marketing_request(self, project: Project, user_input: Dict[str, Any]) -> Dict[str, Any]:
        prompt = f"""Projeto: {project.name}
Objetivo: {project.objective}
Público: {project.target_audience}
Orçamento: R$ {project.budget:,.2f}
Datas: {project.start_date} a {project.end_date}
Áreas: {[d.value for d in project.departments]}

Input do usuário:
{json.dumps(user_input, ensure_ascii=False, indent=2)}

{MARKETING_REQUEST_PROMPT}

Retorne JSON com briefing estruturado."""
        
        schema = {
            "type": "object",
            "properties": {
                "briefing": {"type": "string"},
                "priority": {"type": "string"},
                "estimated_effort": {"type": "string"},
                "suggested_team": {"type": "array", "items": {"type": "string"}},
                "deliverables": {"type": "array", "items": {"type": "string"}},
                "timeline": {"type": "string"}
            },
            "required": ["briefing", "priority", "estimated_effort", "suggested_team"]
        }
        
        result = await self.llm.complete_structured(prompt, schema, ANALYSIS_SYSTEM_PROMPT)
        return result


def get_ai_service(db: Session, provider: str = "openai", api_key: str = "", model: str = "gpt-4o") -> AIAnalysisService:
    llm = get_llm_provider(provider, api_key, model)
    return AIAnalysisService(db, llm)