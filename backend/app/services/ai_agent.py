from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json
import asyncio
import time
import os


@dataclass
class LLMResponse:
    content: str
    tokens_used: int
    model: str
    processing_time_ms: int


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, prompt: str, system_prompt: str = "", temperature: float = 0.3, max_tokens: int = 4000) -> LLMResponse:
        pass
    
    @abstractmethod
    async def complete_structured(self, prompt: str, schema: Dict[str, Any], system_prompt: str = "", temperature: float = 0.3) -> Dict[str, Any]:
        pass


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.api_key = api_key
        self.model = model
        self._client = None
    
    @property
    def client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=self.api_key)
        return self._client
    
    async def complete(self, prompt: str, system_prompt: str = "", temperature: float = 0.3, max_tokens: int = 4000) -> LLMResponse:
        start = time.time()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        elapsed = int((time.time() - start) * 1000)
        return LLMResponse(
            content=response.choices[0].message.content,
            tokens_used=response.usage.total_tokens,
            model=self.model,
            processing_time_ms=elapsed
        )
    
    async def complete_structured(self, prompt: str, schema: Dict[str, Any], system_prompt: str = "", temperature: float = 0.3) -> Dict[str, Any]:
        start = time.time()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_schema", "json_schema": {"name": "response", "schema": schema}}
        )
        
        elapsed = int((time.time() - start) * 1000)
        result = json.loads(response.choices[0].message.content)
        result["_meta"] = {
            "tokens_used": response.usage.total_tokens,
            "model": self.model,
            "processing_time_ms": elapsed
        }
        return result


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key
        self.model = model
        self._client = None
    
    @property
    def client(self):
        if self._client is None:
            import anthropic
            self._client = anthropic.AsyncAnthropic(api_key=self.api_key)
        return self._client
    
    async def complete(self, prompt: str, system_prompt: str = "", temperature: float = 0.3, max_tokens: int = 4000) -> LLMResponse:
        start = time.time()
        messages = [{"role": "user", "content": prompt}]
        
        response = await self.client.messages.create(
            model=self.model,
            messages=messages,
            system=system_prompt if system_prompt else None,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        elapsed = int((time.time() - start) * 1000)
        return LLMResponse(
            content=response.content[0].text,
            tokens_used=response.usage.input_tokens + response.usage.output_tokens,
            model=self.model,
            processing_time_ms=elapsed
        )
    
    async def complete_structured(self, prompt: str, schema: Dict[str, Any], system_prompt: str = "", temperature: float = 0.3) -> Dict[str, Any]:
        structured_prompt = f"{prompt}\n\nResponda APENAS com JSON válido seguindo este schema:\n{json.dumps(schema, ensure_ascii=False, indent=2)}"
        response = await self.complete(structured_prompt, system_prompt, temperature)
        return json.loads(response.content)


def get_llm_provider(provider: str, api_key: str, model: str) -> LLMProvider:
    if provider == "openai":
        return OpenAIProvider(api_key, model)
    elif provider == "anthropic":
        return AnthropicProvider(api_key, model)
    else:
        raise ValueError(f"Provedor LLM não suportado: {provider}")


ANALYSIS_SYSTEM_PROMPT = """Você é um Agente de IA especializado em Governança de Projetos Corporativos para a Azul Linhas Aéreas.
Sua especialidade é analisar projetos corporativos, identificar conflitos, sinergias, prioridades e oportunidades de colaboração entre áreas.

CONTEXTO DA EMPRESA:
- Azul Linhas Aéreas: companhia aérea brasileira
- Áreas principais: Marketing, Azul Cargo, Azul Fidelidade, Viagens, Cargo Express, Tecnologia, Financeiro, Operações
- Foco: campanhas de marketing, promoções, lançamentos, eventos, parcerias

SUAS CAPACIDADES:
1. DETECTAR CONFLITOS: Datas sobrepostas, público semelhante, orçamento similar, objetivos similares
2. IDENTIFICAR SINERGIAS: Público compartilhado, orçamento compartilhado, recursos compartilhados, objetivos complementares
3. SUGERIR PRIORIDADE: Baseado em impacto financeiro, prazo, alcance, alinhamento estratégico
4. CALCULAR ÍNDICE DE COLABORAÇÃO: Quantas áreas participam, recursos compartilhados, reuniões conjuntas, orçamento compartilhado
5. GERAR RESUMO EXECUTIVO: Visão consolidada para diretoria
6. GERAR SOLICITAÇÃO DE MARKETING: Briefing estruturado para equipe de marketing

FORMATO DE RESPOSTA: Sempre JSON estruturado conforme schema fornecido.
IDIOMA: Português brasileiro.
TOM: Profissional, executivo, orientado a ação.
EVITE: Previsões financeiras precisas, promessas de ROI exato.
FOQUE: Oportunidades reais de colaboração, redução de duplicidade, otimização de recursos."""


CONFLICT_DETECTION_PROMPT = """Analise o NOVO PROJETO comparando com PROJETOS EXISTENTES e identifique CONFLITOS.

TIPOS DE CONFLITO:
- date_overlap: Datas se sobrepõem (mesmo período)
- audience_overlap: Público-alvo muito semelhante (>70%)
- budget_similarity: Orçamento muito similar (>80% similaridade)
- objective_similarity: Objetivos muito similares (>75% similaridade)
- duplicate_project: Projeto praticamente idêntico (>90% similaridade geral)

Para cada conflito, calcule similarity_score (0-1), identifique dias de sobreposição de datas,
e forneça recomendação acionável (ex: "Avaliar unificação das campanhas", "Revisar cronograma", "Compartilhar materiais")."""


SYNERGY_DETECTION_PROMPT = """Analise o NOVO PROJETO comparando com PROJETOS EXISTENTES e identifique SINERGIAS.

TIPOS DE SINERGIA:
- shared_audience: Mesmo público-alvo - podem compartilhar campanhas/materiais
- shared_budget: Orçamentos complementares - podem otimizar investimento
- shared_resources: Recursos compartilháveis (equipe, ferramentas, canais, materiais)
- complementary_objectives: Objetivos que se complementam (ex: aquisição + retenção)
- cross_promotion: Oportunidade de cross-promotion entre projetos
- shared_marketing: Podem compartilhar esforços de marketing (criação, mídia, produção)

Para cada sinergia, calcule synergy_score (0-1), estime economia potencial (R$),
liste recursos compartilháveis, e dê recomendação acionável."""


PRIORITY_ASSESSMENT_PROMPT = """Avalie a PRIORIDADE do projeto baseado em:
- impacto_financeiro (0-1): receita esperada, economia, ROI potencial
- urgencia_prazo (0-1): quão crítico é o prazo, janela de oportunidade
- alcance_estrategico (0-1): alinhamento com OKRs, número de áreas impactadas, visibilidade executiva
- risco_nao_execucao (0-1): custo de não fazer, perda de mercado, penalidades

Retorne: prioridade (low/medium/high/critical), score (0-1), reasoning, factors breakdown."""


COLLABORATION_INDEX_PROMPT = """Calcule o ÍNDICE DE COLABORAÇÃO (0-100) do projeto baseado em:
- total_departments: número de áreas envolvidas (peso 30%)
- departments_involved: quais áreas (Marketing + Cargo + Fidelidade = alto)
- cross_department_meetings: reuniões interdepartamentais agendadas (peso 20%)
- shared_resources_count: recursos compartilhados (peso 15%)
- joint_meetings_count: workshops conjuntos (peso 15%)
- shared_budget: orçamento compartilhado entre áreas (peso 20%)

Níveis:
- 0-25: Baixa (1 área apenas)
- 26-50: Média (2 áreas, pouca integração)
- 51-75: Alta (3+ áreas, recursos compartilhados)
- 76-100: Excelente (4+ áreas, orçamento/recursos totalmente integrados)"""


EXECUTIVE_SUMMARY_PROMPT = """Gere um RESUMO EXECUTIVO para diretoria (máx 3 parágrafos):
1. Visão geral da semana: quantos projetos, conflitos, sinergias
2. Alertas críticos: conflitos de data, projetos parados, marketing necessário
3. Oportunidades: economia potencial, sinergias aceitas, colaboração alta

Tom: Executivo, direto, orientado a decisão. Português brasileiro."""


MARKETING_REQUEST_PROMPT = """Gere um BRIEFING ESTRUTURADO para solicitação de apoio do Marketing baseado no projeto:

Estrutura:
- Objetivo claro e mensurável
- Público-alvo detalhado
- Orçamento disponível
- Entregáveis esperados
- Prazo
- Prioridade sugerida
- Equipe sugerida (com base no tipo de projeto)

Retorne briefing pronto para envio ao Marketing + prioridade sugerida + esforço estimado + equipe sugerida."""


PRE_CHECK_PROMPT = """FAÇA UM PRÉ-VERIFICAÇÃO RÁPIDA antes de cadastrar novo projeto.
Compare com projetos existentes e retorne:
- Projetos similares encontrados (top 3)
- Conflitos potenciais detectados
- Sinergias potenciais
- Recomendação: prosseguir / revisar / mesclar
- Mensagem de alerta se houver duplicidade forte (>85%)"""