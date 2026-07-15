import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingApi, projectsApi } from '../lib/apiMethods';
import type { MarketingRequest, ProjectPriority } from '../types';
import toast from 'react-hot-toast';

const statusLabels = {
  pending: 'Pendente', in_progress: 'Em Andamento', completed: 'Concluído', rejected: 'Rejeitado',
};
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800', in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800',
};
const priorityColors: Record<ProjectPriority, string> = {
  low: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800',
};

export function MarketingRequests() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: requestsResponse } = useQuery({
    queryKey: ['marketingRequests', statusFilter],
    queryFn: () => marketingApi.list(statusFilter || undefined),
  });

  const { data: projectsResponse } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const requests = requestsResponse?.data || [];
  const projects = projectsResponse?.data || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => marketingApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketingRequests'] }),
  });

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitações de Marketing</h1>
          <p className="text-gray-500 mt-1">Gerencie pedidos de apoio da equipe de marketing</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluído</option>
            <option value="rejected">Rejeitado</option>
          </select>
        </div>

        {requests.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma solicitação</h3>
            <p className="mt-1 text-gray-500">Nenhuma solicitação encontrada para o filtro selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projeto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Objetivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Público</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orçamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link to={`/projects/${req.project_id}`} className="font-medium text-gray-900 hover:text-primary-600">
                        {req.project?.name || `Projeto #${req.project_id}`}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate block">{req.objective}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate block">{req.target_audience}</td>
                    <td className="px-6 py-4 text-gray-900">R$ {req.budget?.toLocaleString('pt-BR') || '0'}</td>
                    <td className="px-6 py-4 text-gray-600">{req.deadline ? format(new Date(req.deadline), 'dd/MM/yyyy') : '-'}</td>
                    <td className="px-6 py-4">
                      <select
                        value={req.status}
                        onChange={(e) => handleStatusChange(req.id, e.target.value)}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[req.status]}`}
                      >
                        <option value="pending">Pendente</option>
                        <option value="in_progress">Em Andamento</option>
                        <option value="completed">Concluído</option>
                        <option value="rejected">Rejeitado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[req.priority]}`}>
                        {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleStatusChange(req.id, req.status === 'pending' ? 'in_progress' : 'completed')}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium mr-3"
                      >
                        {req.status === 'pending' ? 'Iniciar' : req.status === 'in_progress' ? 'Concluir' : 'Reabrir'}
                      </button>
                      <button
                        onClick={() => handleStatusChange(req.id, 'rejected')}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Rejeitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}