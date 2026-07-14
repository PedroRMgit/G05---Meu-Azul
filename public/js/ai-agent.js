class AIAgent {
  constructor() {
    this.projects = [];
  }

  setProjects(projects) {
    this.projects = projects;
  }

  analyze() {
    return {
      conflitos: this.detectarConflitos(),
      oportunidades: this.identificarOportunidades(),
      marketingRequests: this.identificarMarketingRequests(),
      prioridades: this.avaliarPrioridades(),
      resumos: this.gerarResumos()
    };
  }

  detectarConflitos() {
    const conflitos = [];
    for (let i = 0; i < this.projects.length; i++) {
      for (let j = i + 1; j < this.projects.length; j++) {
        const a = this.projects[i], b = this.projects[j];
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

  identificarOportunidades() {
    const oportunidades = [];
    for (let i = 0; i < this.projects.length; i++) {
      for (let j = i + 1; j < this.projects.length; j++) {
        const a = this.projects[i], b = this.projects[j];
        if (a.setor === b.setor) {
          oportunidades.push({
            tipo: 'uniao_setor',
            economia: `${Math.ceil((a.equipe + b.equipe) * 0.3)} horas/semana`,
            mensagem: `"${a.nome}" e "${b.nome}" são do mesmo setor (${a.setor}). Unir reuniões pode economizar ${Math.ceil((a.equipe + b.equipe) * 0.3)}h/semana.`,
            projetos: [a.id, b.id]
          });
        }
      const descA = a.descricao.toLowerCase(), descB = b.descricao.toLowerCase();
      const palavrasA = descA.split(/\s+/), palavrasB = descB.split(/\s+/);
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

identificarMarketingRequests() {
  return this.projects
    .filter(p => p.precisaMarketing)
    .map(p => ({
      projetoId: p.id,
      projetoNome: p.nome,
      setor: p.setor,
      mensagem: `O projeto "${p.nome}" do setor ${p.setor} solicitou apoio de marketing.`
    }));
}

avaliarPrioridades() {
  return this.projects.map(p => {
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
      diasRestantes
    };
  });
}

gerarResumos() {
  return this.projects.map(p => {
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
}
