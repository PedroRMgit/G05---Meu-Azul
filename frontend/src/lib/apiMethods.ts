import { api } from './api';

export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', new URLSearchParams({ username, password })),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  testLogin: (accessKey: string, role: string) => api.post('/auth/test-login', { access_key: accessKey, role }),
};

export const projectsApi = {
  list: (params?: { status?: string; department?: string; skip?: number; limit?: number; search?: string }) =>
    api.get('/projects', { params }),
  get: (id: number) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: number, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
  analyze: (id: number) => api.post(`/projects/${id}/analyze`),
  preCheck: (data: any) => api.post('/projects/pre-check', data),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  metrics: (days: number = 30) => api.get('/dashboard/metrics', { params: { days } }),
};

export const calendarApi = {
  get: (startDate: string, endDate: string) => api.get('/calendar', { params: { start_date: startDate, end_date: endDate } }),
};

export const marketingApi = {
  list: (status?: string) => api.get('/marketing-requests', { params: { status } }),
  create: (data: any) => api.post('/marketing-requests', data),
  update: (id: number, data: any) => api.put(`/marketing-requests/${id}`, data),
};

export const departmentsApi = {
  list: () => api.get('/departments'),
  create: (data: any) => api.post('/departments', data),
};

export const collaborationApi = {
  get: (projectId: number) => api.get(`/projects/${projectId}/collaboration-index`),
};

export const conflictsApi = {
  list: (projectId: number) => api.get(`/projects/${projectId}/conflicts`),
};

export const synergiesApi = {
  list: (projectId: number) => api.get(`/projects/${projectId}/synergies`),
};