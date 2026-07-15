from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import json
import httpx
import time


class LLMProvider(ABC):
    @property
    @abstractmethod
    def model(self) -> str:
        pass
    
    @abstractmethod
    async def complete(self, prompt: str, system_prompt: str = "") -> str:
        pass
    
    @abstractmethod
    async def complete_structured(self, prompt: str, schema: Dict[str, Any], system_prompt: str = "") -> Dict[str, Any]:
        pass


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.api_key = api_key
        self._model = model
        self.client = httpx.AsyncClient(
            base_url="https://api.openai.com/v1",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=60.0
        )
    
    @property
    def model(self) -> str:
        return self._model
    
    async def complete(self, prompt: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = await self.client.post("/chat/completions", json={
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 4000
        })
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    
    async def complete_structured(self, prompt: str, schema: Dict[str, Any], system_prompt: str = "") -> Dict[str, Any]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = await self.client.post("/chat/completions", json={
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 4000,
            "response_format": {"type": "json_schema", "json_schema": {"name": "analysis", "schema": schema, "strict": True}}
        })
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)
    
    async def close(self):
        await self.client.aclose()


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key
        self._model = model
        self.client = httpx.AsyncClient(
            base_url="https://api.anthropic.com/v1",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            },
            timeout=60.0
        )
    
    @property
    def model(self) -> str:
        return self._model
    
    async def complete(self, prompt: str, system_prompt: str = "") -> str:
        messages = [{"role": "user", "content": prompt}]
        
        response = await self.client.post("/messages", json={
            "model": self.model,
            "messages": messages,
            "system": system_prompt or "Você é um analista sênior de governança de projetos corporativos.",
            "temperature": 0.3,
            "max_tokens": 4000
        })
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"]
    
    async def complete_structured(self, prompt: str, schema: Dict[str, Any], system_prompt: str = "") -> Dict[str, Any]:
        schema_prompt = f"\n\nResponda APENAS com JSON válido seguindo este schema:\n{json.dumps(schema, ensure_ascii=False)}"
        full_prompt = prompt + schema_prompt
        
        content = await self.complete(full_prompt, system_prompt)
        
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
            raise
    
    async def close(self):
        await self.client.aclose()


def get_llm_provider(provider: str, api_key: str, model: str) -> LLMProvider:
    if provider == "openai":
        return OpenAIProvider(api_key, model)
    elif provider == "anthropic":
        return AnthropicProvider(api_key, model)
    else:
        raise ValueError(f"Provedor LLM não suportado: {provider}")