import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../lib/apiMethods';
import type { ProjectStatus, ProjectPriority, Department } from '../types';

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Rascunho', planning: 'Planejamento', active: 'Ativo', on_hold: 'Pausado', completed: 'Concluído', cancelled: 'Cancelado',
};
const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-gray-100 text-gray-800', planning: 'bg-blue-100 text-blue-800', active: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800', completed: 'bg-purple-100 text-purple-800', cancelled: 'bg-red-100 text-red-800',
};
const priorityColors: Record<ProjectPriority, string> = {
  low: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800',
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'conflicts' | 'synergies' | 'marketing'>('overview');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(Number(id!)),
    enabled: !!id,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => projectsApi.analyze(Number(id!)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', id] }),
  });

  const preCheckMutation = useMutation({
    mutationFn: (data: any) => projectsApi.preCheck(data),
  });

  if (isLoading) {
    return <div className="p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div><div className="grid grid-cols-3 gap-4 h-48 bg-gray-200 rounded"></div></div>;
  }

  if (!project) {
    return <div className="p-6 text-center text-gray-500">Projeto não encontrado</div>;
  }

  const p = project.data || project;
  const handlePreCheck = async () => {
    const result = await preCheckMutation.mutateAsync({
      name: p.name,
      objective: p.objective,
      start_date: p.start_date,
      end_date: p.end_date,
      budget: p.budget,
      target_audience: p.target_audience,
      departments: p.departments,
    });
    console.log('Pre-check result:', result);
    alert('Verificação prévia concluída. Veja o console para detalhes.');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/projects" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">← Voltar</Link>
          <h1 className="text-2xl font-bold text-gray-900">{p.name}</h1>
          <p className="text-gray-500 mt-1">{p.description || 'Sem descrição'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {analyzeMutation.isPending ? 'Analisando...' : '🤖 Analisar com IA'}
          </button>
          <Link to={`/projects/${id}/edit`} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Editar</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">Status</p>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[p.status as ProjectStatus]}`}>{statusLabels[p.status as ProjectStatus]}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">Prioridade</p>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${priorityColors[p.priority as ProjectPriority]}`}>{p.priority.charAt(0).toUpperCase() + p.priority.slice(1)}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">Orçamento</p>
          <p className="text-xl font-bold text-gray-900">R$ {p.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">Colaboração IA</p>
          <p className="text-xl font-bold text-primary-600">{(p.ai_collaboration_index || 0).toFixed(1)}%</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px" aria-label="Tabs">
          {[
            { key: 'overview', label: 'Visão Geral' },
            { key: 'conflicts', label: `Conflitos (${p.ai_conflict_score ? p.ai_conflict_score * 10 : 0})` },
            { key: 'synergies', label: `Sinergias (${p.ai_synergy_score ? p.ai_synergy_score * 10 : 0})` },
            { key: 'marketing', label: 'Marketing' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Objetivo</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{p.objective || 'Não informado'}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Público-alvo</h3>
            <p className="text-gray-600">{p.target_audience || 'Não informado'}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Período</h3>
            <p className="text-gray-600">{format(new Date(p.start_date), 'dd/MM/yyyy')} a {format(new Date(p.end_date), 'dd/MM/yyyy')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Áreas Envolvidas</h3>
            <div className="flex flex-wrap gap-2">
              {p.departments.map((d: Department) => (
                <span key={d} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{d}</span>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado Esperado</h3>
            <p className="text-gray-600">{p.expected_outcome || 'Não informado'}</p>
          </div>
        </div>
      )}

      {activeTab === 'conflicts' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Conflitos Detectados pela IA</h3>
            <button onClick={handlePreCheck} className="text-sm text-primary-600 hover:text-primary-800">Ver pré-verificação</button>
          </div>
          <div className="p-4 text-center text-gray-500">
            Nenhum conflito detectado. Use "Analisar com IA" para verificar.
          </div>
        </div>
      )}

      {activeTab === 'synergies' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center text-gray-500">
          Nenhuma sinergia identificada. Use "Analisar com IA" para verificar.
        </div>
      )}

      {activeTab === 'marketing' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Solicitações de Apoio ao Marketing</h3>
          </div>
          <div className="p-4 text-center text-gray-500">
            Nenhuma solicitação. Crie uma para pedir apoio de materiais gráficos, mídia, etc.
          </div>
        </div>
      )}
    </div>
  );
}