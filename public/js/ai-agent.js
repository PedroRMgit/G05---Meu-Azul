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
      marketingRanking: this.rankProjetosMarketing(),
      prioridades: this.avaliarPrioridades(),
      resumos: this.gerarResumos()
    };
  }

  rankProjetosMarketing() {
    return this.projects
      .map(p => {
        const score = (p.cViability || 3) + (p.cImpact || 3) + (p.cAreas || 3) + (p.cAlignment || 3) + (p.cInnovation || 3);
        const nivel = score >= 22 ? 'Crítico' : score >= 18 ? 'Alto' : score >= 13 ? 'Médio' : 'Baixo';
        return {
          id: p.id,
          nome: p.nome,
          vertical: p.vertical,
          score,
          nivel,
          viabilidade: p.cViability || 3,
          impacto: p.cImpact || 3,
          areas: p.cAreas || 3,
          alinhamento: p.cAlignment || 3,
          inovacao: p.cInnovation || 3
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  detectarConflitos() {
    const conflitos = [];
    for (let i = 0; i < this.projects.length; i++) {
      for (let j = i + 1; j < this.projects.length; j++) {
        const a = this.projects[i], b = this.projects[j];
        if (a.prazo === b.prazo && a.vertical !== b.vertical) {
          conflitos.push({
            tipo: 'prazo',
            gravidade: 'alta',
            mensagem: `"${a.nome}" (${a.vertical}) e "${b.nome}" (${b.vertical}) têm o mesmo prazo: ${a.prazo}`,
            projetos: [a.id, b.id]
          });
        }
        if (a.vertical === b.vertical && a.prazo === b.prazo) {
          conflitos.push({
            tipo: 'recurso',
            gravidade: 'media',
            mensagem: `"${a.nome}" e "${b.nome}" são da mesma vertical (${a.vertical}) com prazos idênticos. Considere redistribuir recursos.`,
            projetos: [a.id, b.id]
          });
        }
      }
    }
    return conflitos;
  }

  identificarOportunidades() {
    return [];
  }

  identificarMarketingRequests() {
    return this.projects
      .filter(p => p.precisaMarketing)
      .map(p => ({
        projetoId: p.id,
        projetoNome: p.nome,
        vertical: p.vertical,
        mensagem: `O projeto "${p.nome}" da vertical ${p.vertical} solicitou apoio de marketing.`
      }));
  }

  getTop3Marketing() {
    const ranking = this.rankProjetosMarketing();
    return ranking.slice(0, 3);
  }

  avaliarPrioridades() {
    return this.projects.map(p => {
      const prazoDate = new Date(p.prazo);
      const hoje = new Date();
      const diasRestantes = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
      let urgencia = diasRestantes <= 7 ? 5 : diasRestantes <= 30 ? 3 : 1;
      let impacto = p.equipe >= 5 ? 5 : p.equipe >= 3 ? 3 : 1;
      let rentabilidade = (p.lucro || 0) - (p.custo || 0);
      let rentScore = rentabilidade > 10000 ? 3 : rentabilidade > 5000 ? 2 : rentabilidade > 0 ? 1 : rentabilidade > -5000 ? 0 : -1;
      let prioridade = Math.min(10, Math.max(1, urgencia + impacto + (p.precisaMarketing ? 2 : 0) + rentScore));
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
        resumo: `${p.nome} é um projeto da vertical ${p.vertical} com equipe de ${p.equipe} pessoa(s). Prazo: ${p.prazo} (${statusPrazo}). Responsável: ${p.responsavel || 'não definido'}. Custo: R$ ${(p.custo || 0).toFixed(2)} | Lucro: R$ ${(p.lucro || 0).toFixed(2)}. ${p.precisaMarketing ? 'Solicita apoio de marketing.' : 'Não requer marketing no momento.'} Descrição: ${p.descricao.substring(0, 100)}${p.descricao.length > 100 ? '...' : ''}`,
        statusPrazo,
        vertical: p.vertical,
        equipe: p.equipe,
        custo: p.custo,
        lucro: p.lucro,
        responsavel: p.responsavel
      };
    });
  }

  avaliarCriteriosMarketing(project) {
    const texto = `${project.nome} ${project.descricao || ''}`.toLowerCase();
    const palavras = texto.split(/\s+/);

    const keywords_viability = ['viável', 'viabilidade', 'executível', 'implementar', 'infraestrutura', 'recursos', 'orçamento', 'custo', 'investimento', 'prazo', 'cronograma', 'fazível', 'possível'];
    const keywords_impact = ['impacto', 'cliente', 'passageiro', 'experiência', 'satisfação', 'nps', 'qualidade', 'serviço', 'atendimento', 'usuário', 'benefício', 'melhoria', 'transformação'];
    const keywords_areas = ['áreas', 'departamento', 'time', 'equipe', 'multidisciplinar', 'colaboração', 'parceria', 'integração', 'vertical', 'operações', 'logística', 'tecnologia', 'marketing', 'vendas', 'comercial', 'toda empresa', 'cross'];
    const keywords_alignment = ['estratégico', 'estratégia', 'missão', 'visão', 'meta', 'objetivo', 'crescimento', 'expansão', 'mercado', 'competitivo', 'diferencial', 'posicionamento', 'alinhamento', 'diretriz', 'planejamento'];
    const keywords_innovation = ['inovação', 'inovador', 'novo', 'modernização', 'digital', 'transformação digital', 'tecnologia', 'automação', 'ia', 'inteligência artificial', 'machine learning', 'dados', 'data', 'pioneiro', 'disruptivo', 'startup', 'futuro', 'vanguarda'];

    function score(keywords) {
      let s = 0;
      const matched = new Set();
      for (const kw of keywords) {
        const lowerKw = kw.toLowerCase();
        for (const pal of palavras) {
          if (pal.includes(lowerKw) || lowerKw.includes(pal)) {
            if (!matched.has(pal)) { s++; matched.add(pal); }
          }
        }
      }
      const norm = Math.min(5, Math.max(1, Math.round(s / 2) + 1));
      return norm;
    }

    return {
      cViability: score(keywords_viability),
      cImpact: score(keywords_impact),
      cAreas: score(keywords_areas),
      cAlignment: score(keywords_alignment),
      cInnovation: score(keywords_innovation)
    };
  }

  detectarNecessidadeMarketing(project) {
    const texto = `${project.nome} ${project.descricao}`.toLowerCase();
    const keywords = [
      'lançamento', 'divulgação', 'divulgar', 'campanha',
      'promoção', 'promover', 'propaganda', 'comunicação',
      'mídia', 'mídias', 'redes sociais', 'rede social',
      'branding', 'marketing', 'publicidade',
      'anúncio', 'anúncios', 'engajamento',
      'audiência', 'conversão', 'lead', 'leads',
      'vendas', 'vender', 'venda', 'cliente', 'clientes',
      'posicionamento', 'evento', 'eventos',
      'patrocínio', 'parceria', 'parcerias',
      'influenciador', 'influenciadores',
      'tráfego', 'tráfego pago', 'google ads',
      'email marketing', 'newsletter', 'marca',
      'imagem', 'reputação', 'alcance',
      'digital', 'redes', 'social', 'segmento',
      'mercado', 'concorrência', 'pesquisa de mercado',
      'customer', 'usuário', 'usuários',
      'aquisição', 'retenção', 'fidelização',
      'omnicanal', 'omnichannel', 'crm'
    ];
    return keywords.some(kw => texto.includes(kw));
  }
}
