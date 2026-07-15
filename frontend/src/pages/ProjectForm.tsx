import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../lib/apiMethods';
import type { Project, ProjectStatus, ProjectPriority, ProjectType, Department } from '../types';

const deptLabels: Record<Department, string> = {
  marketing: 'Marketing', cargo: 'Azul Cargo', fidelidade: 'Azul Fidelidade', viagens: 'Viagens',
  cargo_express: 'Cargo Express', tecnologia: 'Tecnologia', financeiro: 'Financeiro', operacoes: 'Operações', outros: 'Outros',
};
const departmentOptions: Department[] = ['marketing', 'cargo', 'fidelidade', 'viagens', 'cargo_express', 'tecnologia', 'financeiro', 'operacoes', 'outros'];
const typeOptions: ProjectType[] = ['campaign', 'promotion', 'launch', 'event', 'internal', 'partnership', 'other'];
const statusOptions: ProjectStatus[] = ['draft', 'planning', 'active', 'on_hold', 'completed', 'cancelled'];
const priorityOptions: ProjectPriority[] = ['low', 'medium', 'high', 'critical'];

const typeLabels: Record<ProjectType, string> = {
  campaign: 'Campanha', promotion: 'Promoção', launch: 'Lançamento', event: 'Evento', internal: 'Interno', partnership: 'Parceria', other: 'Outro',
};
const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Rascunho', planning: 'Planejamento', active: 'Ativo', on_hold: 'Pausado', completed: 'Concluído', cancelled: 'Cancelado',
};
const priorityLabels: Record<ProjectPriority, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
};

export function ProjectForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(Number(id!)),
    enabled: isEditing,
  });

  const {
    register, handleSubmit, setValue, reset, watch, formState: { errors }
  } = useForm<Project>({
    defaultValues: {
      name: '', description: '', objective: '', project_type: 'campaign', status: 'draft', priority: 'medium',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      budget: 0, currency: 'BRL', target_audience: '', expected_outcome: '', kpis: {}, departments: [],
    },
  });

  const mutation = useMutation({
    mutationFn: (data: Project) => isEditing ? projectsApi.update(Number(id!), data) : projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
  });

  if (isEditing && isLoading) {
    return <div className="p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div><div className="h-96 bg-gray-200 rounded"></div></div>;
  }

  const onSubmit = (data: Project) => {
    const submitData = { ...data, departments: Array.from(new Set(data.departments)) };
    mutation.mutate(submitData);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/projects" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">← Voltar</Link>
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Projeto' : 'Novo Projeto'}</h1>
        <p className="text-gray-500 mt-1">{isEditing ? 'Atualize as informações do projeto' : 'Cadastre uma nova campanha ou iniciativa'}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Projeto *</label>
            <input {...register('name', { required: true })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Ex: Campanha Verão 2025" />
            {errors.name && <p className="mt-1 text-sm text-red-600">Nome é obrigatório</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select {...register('project_type')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea {...register('description')} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Descrição breve do projeto..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo *</label>
          <textarea {...register('objective', { required: true })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Qual o objetivo principal deste projeto?" />
          {errors.objective && <p className="mt-1 text-sm text-red-600">Objetivo é obrigatório</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
            <input type="date" {...register('start_date', { required: true })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Término *</label>
            <input type="date" {...register('end_date', { required: true })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento (R$)</label>
            <input type="number" step="100" min="0" {...register('budget', { valueAsNumber: true })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register('status')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
            <select {...register('priority')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              {priorityOptions.map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
            <input {...register('currency')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Público-Alvo</label>
          <textarea {...register('target_audience')} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Ex: Pequenas empresas do setor de logística no Brasil" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resultado Esperado</label>
          <textarea {...register('expected_outcome')} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Ex: Aumento de 20% nas vendas para o Nordeste no Q3" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento (R$)</label>
            <input type="number" step="100" min="0" {...register('budget', { valueAsNumber: true })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KPIs (JSON opcional)</label>
            <textarea {...register('kpis')} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm" placeholder='{"conversao": "5%", "alcance": "100000"}' />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Áreas/Departamentos Envolvidos</label>
          <div className="flex flex-wrap gap-2">
            {departmentOptions.map((dept) => (
              <label key={dept} className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" {...register('departments')} value={dept} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                <span className="text-sm">{deptLabels[dept]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <Link to="/projects" className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</Link>
          <button type="submit" disabled={mutation.isPending} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {mutation.isPending ? 'Salvando...' : (isEditing ? 'Atualizar Projeto' : 'Criar Projeto')}
          </button>
        </div>
      </form>
    </div>
  );
}