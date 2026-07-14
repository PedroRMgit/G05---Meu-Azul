const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let projects = [];
let projectIdCounter = 1;

app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { nome, setor, descricao, prazo, equipe, precisaMarketing } = req.body;
  if (!nome || !setor || !descricao || !prazo) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, setor, descricao, prazo' });
  }
  const project = {
    id: projectIdCounter++,
    nome,
    setor,
    descricao,
    prazo,
    equipe: parseInt(equipe) || 1,
    precisaMarketing: precisaMarketing || false,
    criadoEm: new Date().toISOString()
  };
  projects.push(project);
  res.status(201).json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });
  projects.splice(index, 1);
  res.json({ message: 'Projeto removido' });
});

app.get('/api/ai/analysis', (req, res) => {
  const analysis = runAIAnalysis(projects);
  res.json(analysis);
});

function runAIAnalysis(projects) {
  const conflitos = detectarConflitos(projects);
  const oportunidades = identificarOportunidades(projects);
  const marketingRequests = identificarMarketingRequests(projects);
  const prioridades = avaliarPrioridades(projects);
  const resumos = gerarResumos(projects);
  return { conflitos, oportunidades, marketingRequests, prioridades, resumos };
}

function detectarConflitos(projects) {
  const conflitos = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i], b = projects[j];
      if (a.prazo === b.prazo && a.setor !== b.setor) {
        conflitos.push({
          tipo: 'prazo',
          gravidade: 'alta',
          mensagem: `"${a.nome}" (${a.setor}) e "${b.nome}" (${b.setor}) têm o mesmo prazo: ${a.prazo}`,
          projetos: [a.id, b.id]
        });
      }
      if (a.setor === b.setor && a.prazo === b.prazo) {
        conflitos.push({
          tipo: 'recurso',
          gravidade: 'media',
          mensagem: `"${a.nome}" e "${b.nome}" são do mesmo setor (${a.setor}) com prazos idênticos. Considere redistribuir recursos.`,
          projetos: [a.id, b.id]
        });
      }
    }
  }
  return conflitos;
}

function identificarOportunidades(projects) {
  const oportunidades = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i], b = projects[j];
      if (a.setor === b.setor) {
        oportunidades.push({
          tipo: 'uniao_setor',
          economia: `${Math.ceil((a.equipe + b.equipe) * 0.3)} horas/semana`,
          mensagem: `"${a.nome}" e "${b.nome}" são do mesmo setor (${a.setor}). Unir reuniões pode economizar ${Math.ceil((a.equipe + b.equipe) * 0.3)}h/semana.`,
          projetos: [a.id, b.id]
        });
      }
      const descA = a.descricao.toLowerCase(), descB = b.descricao.toLowerCase();
      const palavrasA = descA.split(' '), palavrasB = descB.split(' ');
      const comuns = palavrasA.filter(p => palavrasB.includes(p) && p.length > 4);
      if (comuns.length >= 2) {
        oportunidades.push({
          tipo: 'sinergia',
          economia: `${Math.ceil((a.equipe + b.equipe) * 0.2)} horas/semana`,
          mensagem: `"${a.nome}" e "${b.nome}" compartilham temas similares (${comuns.slice(0, 3).join(', ')}). Considere colaboração.`,
          projetos: [a.id, b.id]
        });
      }
    }
  }
  return oportunidades;
}

function identificarMarketingRequests(projects) {
  return projects
    .filter(p => p.precisaMarketing)
    .map(p => ({
      projetoId: p.id,
      projetoNome: p.nome,
      setor: p.setor,
      mensagem: `O projeto "${p.nome}" do setor ${p.setor} solicitou apoio de marketing.`
    }));
}

function avaliarPrioridades(projects) {
  return projects.map(p => {
    const prazoDate = new Date(p.prazo);
    const hoje = new Date();
    const diasRestantes = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
    let urgencia = diasRestantes <= 7 ? 5 : diasRestantes <= 30 ? 3 : 1;
    let impacto = p.equipe >= 5 ? 5 : p.equipe >= 3 ? 3 : 1;
    let prioridade = Math.min(10, urgencia + impacto + (p.precisaMarketing ? 2 : 0));
    let nivel = prioridade >= 8 ? 'Crítica' : prioridade >= 5 ? 'Alta' : prioridade >= 3 ? 'Média' : 'Baixa';
    return {
      id: p.id,
      nome: p.nome,
      score: prioridade,
      nivel,
      prazo: p.prazo,
      diasRestantes: Math.ceil((new Date(p.prazo) - new Date()) / (1000 * 60 * 60 * 24))
    };
  });
}

function gerarResumos(projects) {
  return projects.map(p => {
    const prazoDate = new Date(p.prazo);
    const hoje = new Date();
    const diasRestantes = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
    const statusPrazo = diasRestantes < 0 ? 'atrasado' : diasRestantes <= 7 ? 'urgente' : diasRestantes <= 30 ? 'próximo' : 'dentro do prazo';
    return {
      id: p.id,
      nome: p.nome,
      resumo: `${p.nome} é um projeto do setor ${p.setor} com equipe de ${p.equipe} pessoa(s). Prazo: ${p.prazo} (${statusPrazo}). ${p.precisaMarketing ? 'Solicita apoio de marketing.' : 'Não requer marketing no momento.'} Descrição: ${p.descricao.substring(0, 100)}${p.descricao.length > 100 ? '...' : ''}`,
      statusPrazo,
      setor: p.setor,
      equipe: p.equipe
    };
  });
}

app.listen(PORT, () => {
  console.log(`Meu Azul rodando em http://localhost:${PORT}`);
});
