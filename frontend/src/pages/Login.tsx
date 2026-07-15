import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

const roles: { value: UserRole; label: string; description: string }[] = [
  { value: 'director', label: 'Diretor', description: 'Visão macro do Dashboard' },
  { value: 'marketing_manager', label: 'Gerente de Marketing', description: 'Projetos e insights de IA' },
  { value: 'analyst', label: 'Analista', description: 'Gerenciar e editar projetos' },
  { value: 'developer', label: 'Desenvolvedor', description: 'Acesso completo ao sistema' },
];

type Step = 'role' | 'action' | 'form';
type Action = 'login' | 'register' | 'test' | null;

export function Login() {
  const { login, register, loginTest } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accessKey, setAccessKey] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('action');
    setError('');
  };

  const handleActionSelect = (selected: Action) => {
    setAction(selected);
    setStep('form');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const role = useAuth.getState().user?.role;
      if (role === 'director' || role === 'developer') {
        navigate('/dashboard');
      } else {
        navigate('/projects');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        email,
        password,
        full_name: name,
        department: 'outros',
        role: selectedRole || 'developer',
      });
      if (selectedRole === 'director' || selectedRole === 'developer') {
        navigate('/dashboard');
      } else {
        navigate('/projects');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginTest(accessKey, selectedRole || 'developer');
      if (selectedRole === 'director' || selectedRole === 'developer') {
        navigate('/dashboard');
      } else {
        navigate('/projects');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro no modo teste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary-600">Meu Azul</h2>
          <p className="mt-2 text-gray-600">Governança de Projetos com IA</p>
        </div>

        {step === 'role' && (
          <>
            <p className="text-center text-gray-700 font-medium">Selecione sua ocupação</p>
            <div className="space-y-3">
              {roles.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRoleSelect(r.value)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">{r.label}</p>
                  <p className="text-sm text-gray-500">{r.description}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'action' && selectedRole && (
          <>
            <p className="text-center text-gray-700 font-medium">
              {roles.find((r) => r.value === selectedRole)?.label}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleActionSelect('login')}
                className="w-full py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => handleActionSelect('register')}
                className="w-full py-3 rounded-lg border border-primary-600 text-primary-600 font-medium hover:bg-primary-50 transition-colors"
              >
                Criar conta
              </button>
              <button
                onClick={() => handleActionSelect('test')}
                className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Teste
              </button>
            </div>
            <button
              onClick={() => setStep('role')}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Voltar
            </button>
          </>
        )}

        {step === 'form' && (
          <>
            {action === 'login' && (
              <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm" role="alert">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="sr-only">Email</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="sr-only">Senha</label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Senha"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            )}

            {action === 'register' && (
              <form className="mt-8 space-y-6" onSubmit={handleRegister}>
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm" role="alert">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="sr-only">Nome</label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Nome"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-email" className="sr-only">Email</label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-password" className="sr-only">Senha</label>
                    <input
                      id="reg-password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Senha (mín. 8 caracteres)"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </form>
            )}

            {action === 'test' && (
              <form className="mt-8 space-y-6" onSubmit={handleTest}>
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm" role="alert">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="access-key" className="sr-only">Chave de acesso</label>
                    <input
                      id="access-key"
                      type="password"
                      required
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Chave de acesso"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Entrando...' : 'Entrar como teste'}
                </button>
              </form>
            )}

            <button
              onClick={() => setStep('action')}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
