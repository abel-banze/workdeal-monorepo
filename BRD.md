# PRD — Workdeal
**Directório de Empresas e Profissionais Independentes com Network Funcional**

| | |
|---|---|
| Versão | 0.4 — decisões de produto incorporadas |
| Autor | Codebaz |
| Data | Agosto 2026 |
| Estado | Em discussão |

---

## 1. Resumo Executivo

A Workdeal é um ecossistema digital para empresas e profissionais independentes em Moçambique, que combina **directório com pesquisa por proximidade**, **network profissional**, **marketplace de tarefas**, **eventos** e **concursos públicos**, sustentado por um **sistema de selos de confiança**. O objectivo é ser o ponto de partida diário para quem procura ou presta serviços — não apenas uma lista estática, mas uma plataforma de oportunidades recorrentes.

Este documento cobre visão, funcionalidades, modelo de negócio, confiança/segurança, arquitectura técnica, operação, crescimento e riscos — nível necessário para decisão de investimento/arranque de desenvolvimento.

---

## 2. Contexto de Mercado

### 2.1 Concorrência e referências indirectas
- **Directórios genéricos:** páginas amarelas digitais, grupos de Facebook/WhatsApp de "compra e venda" — desorganizados, sem verificação nem reputação estruturada.
- **Marketplaces internacionais adaptados:** OLX Moçambique (bens, não serviços profissionais estruturados); Jumia (e-commerce, não serviços).
- **Concursos públicos:** hoje dispersos por sites institucionais (ex: UFSA), sem agregação nem alertas — é uma dor já validada pelo trabalho actual da Workdeals.
- **Redes profissionais internacionais** (LinkedIn) — pouco penetradas para PMEs/profissionais informais/semi-formais em Moçambique, e sem foco local de "encontrar alguém perto de mim agora".

### 2.2 Espaço em aberto
Não existe, no mercado moçambicano, uma plataforma que junte **directório local + reputação verificável + oportunidades recorrentes (tarefas, eventos, concursos)** — esta combinação é a aposta central da Workdeal.

---

## 3. Visão, Objectivos e North Star Metric

### 3.1 Visão
Ser a infra-estrutura de confiança sobre a qual empresas e profissionais moçambicanos encontram trabalho, clientes e oportunidades — online, geolocalizado e verificável.

### 3.2 North Star Metric
**Nº de "conexões de valor" concluídas por semana** — definidas como: uma tarefa atribuída, uma inscrição confirmada num evento, ou um contacto gerado a partir do directório que resultou em resposta. Este é o indicador que combina os três motores (directório, tarefas, eventos) num só número que representa "a plataforma gerou negócio real".

### 3.3 Objectivos de negócio
1. Tornar-se plataforma de referência para PMEs e profissionais independentes em Moçambique.
2. Criar efeito de rede sustentável (mais perfis → mais tarefas/eventos/concursos → mais perfis).
3. Diversificar receita (assinaturas, comissões, publicidade local, dados B2B) para não depender de uma única fonte.

### 3.4 Objectivos de produto — Fase 1 (MVP)
1. Perfil completo de empresa, com selos base.
2. Pesquisa e descoberta por proximidade e categoria.
3. Módulo de Concursos Públicos com alertas (reaproveita infra-estrutura já construída).
4. Interacção de rede mínima (seguir, contactar, avaliar).

### 3.5 Fora de âmbito — Fase 1
- Pagamentos/escrow completos dentro da plataforma.
- Chat em tempo real avançado (mensagens assíncronas simples chegam).
- App móvel nativa (PWA responsiva primeiro).
- Fórum e Academia (fases posteriores).

---

## 4. Utilizadores-alvo e Personas

| Persona | Descrição | Necessidade principal | Motivação de retorno à plataforma |
|---|---|---|---|
| **Empresa (PME)** | Presta serviços, quer crescer | Leads, credibilidade, concursos | Alertas de concursos, novas tarefas, mensagens |
| **Profissional independente** | Freelancer/técnico/consultor | Vitrine, reputação, trabalho | Notificações de tarefas na área, novas conexões |
| **Cliente/utilizador final** | Precisa de um serviço | Confiança + rapidez | Histórico de pedidos, favoritos |
| **Organizador de eventos** | Empresa/associação/Workdeal | Divulgação e gestão de inscrições | Painel de gestão de eventos |
| **Gestor de compras/concursos** | Empresa que concorre a concursos públicos | Não perder prazos | Alertas personalizados |
| **Equipa de operações Workdeal (interna)** | Modera, verifica, atende suporte | Ferramentas eficientes de gestão | Painel administrativo |

---

## 5. Jornadas de Utilizador (Core Flows)

1. **Descoberta → Contacto:** utilizador pesquisa "electricista perto de mim" → filtra por selo "Verificado" → vê perfil com avaliações → contacta via WhatsApp/mensagem interna.
2. **Publicação de Tarefa → Proposta → Conclusão:** cliente publica tarefa → profissionais da categoria recebem notificação → enviam proposta → cliente escolhe → tarefa concluída → avaliação mútua → selo actualizado.
3. **Alerta de Concurso → Candidatura externa:** empresa define categorias de interesse → recebe alerta de novo concurso relevante → acede ao detalhe/documento fonte → (fase futura) manifesta interesse/forma consórcio via conexões.
4. **Evento → Networking:** organizador cria evento → utilizadores próximos são notificados → inscrevem-se → participam → pós-evento podem conectar-se com outros participantes.
5. **Onboarding de novo perfil:** registo → escolha tipo de perfil → preenchimento guiado → selo "Perfil Completo" atribuído automaticamente → sugestão de primeiras acções (seguir categorias, publicar 1º trabalho no portfólio).

---

## 6. Funcionalidades — Directório e Network

### 6.1 Perfis
- Tipo: **Empresa** ou **Profissional Independente**; empresas suportam múltiplos utilizadores/membros com papéis (admin, editor, membro).
- Campos: nome, foto/logotipo, capa, categorias, descrição, localização (morada + coordenadas), contactos, horário, portfólio, documentos de verificação (NUIT/BI, submissão privada).
- Estados: activo, verificado, suspenso, em análise.
- Página pública partilhável, optimizada para SEO.

### 6.2 Directório e Pesquisa
- Listagem por categoria/subcategoria; pesquisa por palavra-chave com motor de full-text (ex: Meilisearch/Typesense/Postgres `tsvector`, a decidir na fase técnica).
- Filtros: categoria, distância, selos, avaliação.
- **Nearby** com geolocalização (indexação geoespacial).
- Vista em lista e em mapa.
- Favoritos/perfis guardados pelo utilizador.

### 6.3 Selos (ver secção 12 para detalhe completo)

### 6.4 Network Funcional
- Seguir, conexões (pedido/aceitação), recomendações/avaliações, feed de actividade, mensagens internas, contacto directo.

### 6.5 Onboarding e Gestão de Perfil
- Registo guiado por passos; painel de gestão com estatísticas básicas (visualizações, cliques em contactar, origem do tráfego).

---

## 7. Funcionalidades — Oportunidades (Eventos, Tarefas, Concursos)

### 7.1 Eventos
- Criação **restrita a perfis verificados e aprovados** (decisão confirmada) — reduz risco de spam/eventos falsos sem depender só de moderação reactiva.
- Inscrição/RSVP; lembrete automático; página partilhável; "perto de mim"; networking pós-evento.
- Fluxo: perfil solicita criar evento → equipa confirma que o perfil está verificado (ou pede verificação primeiro) → evento publicado.

### 7.2 Tarefas (Marketplace)
- Publicação de tarefa → notificação a profissionais relevantes → propostas/orçamentos → escolha → execução → avaliação (apenas o cliente avalia o profissional — ver secção 8.3).
- **Modelo de transacção:** a arquitectura de comissão/pagamento deve estar **prevista desde o desenho inicial** (campos de valor da tarefa, estado de pagamento, hooks para gateway de pagamento), mas **sem transacção real activada na Fase 1** — a fase 1 é ligação cliente-profissional pura, o pagamento combina-se fora da plataforma. Isto evita re-arquitectura mais tarde quando a comissão for activada (Fase 3).
- **Resolução de disputas:** fluxo de contestação caso cliente/profissional discordem do resultado, com revisão manual pela equipa de operações (que já existe — ver secção 11.3).

### 7.3 Concursos Públicos
- Fonte única e definitiva: **UFSA** (decisão confirmada — não agregar outras fontes por agora). O modelo de dados (`tenders.fonte`) mantém-se preparado para múltiplas fontes no futuro, mas o scraper/sync bot foca-se exclusivamente na UFSA.
- Alertas por categoria/província/prazo (email, WhatsApp, Telegram); ligação a perfis de empresas relevantes.

---

## 8. Sugestões de Alto Valor Adicional (para crescimento e diferenciação)

| Iniciativa | Valor | Fase sugerida |
|---|---|---|
| RFQ (Pedido de Orçamento) — 1 pedido, várias propostas | Reduz fricção, aumenta conversão | 2 |
| Notificações inteligentes (push/WhatsApp/email) | Retenção e frequência de uso | 1-2 |
| Gamificação (pontos, níveis, selos progressivos) | Hábito e engagement | 2 |
| Histórico público de tarefas concluídas | Confiança verificável | 2 |
| Analytics do próprio perfil (visitas, origem de contactos) | Incentivo a manter perfil actualizado | 1 |
| Programa de indicação (referral) | Aquisição orgânica | 2 |
| Grupos/comunidades por sector | Retenção, pertença | 3 |
| Fórum de perguntas e respostas (indexável) | SEO e aquisição orgânica | 3 |
| Blog/conteúdo educativo (SEO) | Aquisição orgânica | 2-3 |
| Bolsa de emprego (job board) | Amplia base de utilizadores | 4 |
| Academia Workdeal (micro-cursos + selo) | Receita adicional, credibilidade dos selos | 4 |
| Integração WhatsApp Business API | Canal preferido em Moçambique | 1-2 |
| API/exportação de dados para parceiros B2B (bancos, seguradoras, ONGs) | Nova linha de receita | 4 |
| Painel para associações empresariais/câmaras de comércio | Parcerias institucionais, aquisição em massa | 3 |

---

## 9. Modelo de Negócio e Monetização

| Fonte de receita | Descrição | Fase |
|---|---|---|
| **Plano Premium (perfil)** | Destaque em pesquisa, mais fotos/portfólio, estatísticas avançadas, selo "Pro" | 3 |
| **Selos verificados pagos** | Verificação expresso/prioritária | 3 |
| **Comissão em Tarefas** | % sobre valor acordado em tarefas concluídas na plataforma | 3 |
| **Bilhetes de eventos pagos** | Comissão sobre venda de bilhetes | 3 |
| **Alertas premium de concursos** | Alertas mais rápidos/detalhados, filtros avançados, exportação | 2-3 |
| **Publicidade local** | Destaque pago de perfis/categorias em página inicial | 3 |
| **Dados/API B2B** | Acesso a dados agregados e geolocalizados para parceiros institucionais | 4 |

> Fase 1 deve permanecer **gratuita** para maximizar aquisição e densidade de perfis — sem massa crítica de oferta, nenhuma monetização funciona.

---

## 10. Confiança, Segurança e Moderação

### 10.1 Equipa de operações
A Workdeal **conta desde o dia 1 com equipa dedicada** para verificação de perfis e moderação (decisão confirmada) — não fica a cargo da equipa de desenvolvimento. Isto permite um processo de verificação manual mais rigoroso já na Fase 1, e sustenta a criação de eventos restrita a perfis verificados (secção 7.1).

### 10.2 Verificação e moderação
- **Verificação de identidade/empresa:** submissão de NUIT/BI/alvará, validada manualmente pela equipa de operações, com fila de revisão no painel administrativo. Como há capacidade dedicada, definir um SLA interno alvo (ex: 24-48h úteis) para dar previsibilidade aos utilizadores — a decidir com a equipa de operações.
- **Moderação de conteúdo:** denúncia de perfis, tarefas e eventos falsos ou impróprios; regras claras de remoção.

### 10.3 Integridade de avaliações
- **Apenas clientes avaliam profissionais/empresas** (decisão confirmada) — não há peer-review entre profissionais. Simplifica o modelo de confiança: a reputação reflecte sempre a perspectiva de quem contratou o serviço, não a de pares/concorrentes.
- Impedir auto-avaliação, avaliações compradas ou em massa (ex: limitar avaliações a quem teve uma tarefa/contacto real registado).
- **Resolução de disputas em Tarefas:** processo definido de mediação para desacordos entre cliente e profissional.
- **Prevenção de fraude em selos:** distinção clara entre selos automáticos (regras), manuais (equipa) e pagos, para não comprometer a credibilidade do sistema de selos, que é o pilar de confiança da marca.
- **Protecção de dados pessoais:** alinhamento com a legislação moçambicana de protecção de dados; política de privacidade e termos de uso claros; consentimento explícito para partilha de localização e dados de contacto.
- **Termos de Serviço e Política de Conteúdo:** necessários antes do lançamento público, cobrindo responsabilidade sobre tarefas/eventos publicados por terceiros.

---

## 11. Arquitectura Técnica (alto nível)

### 11.1 Stack
| Camada | Tecnologia |
|---|---|
| Frontend | Next.js |
| Backend | Hono (API) |
| Autenticação | better-auth (com extensão para organizações/papéis multi-membro) |
| ORM | Drizzle |
| Base de dados | PostgreSQL (+ extensão geoespacial tipo PostGIS) |
| Pesquisa | Postgres full-text (`tsvector`/`pg_trgm`) — decisão confirmada; reavaliar migração para motor dedicado (Meilisearch/Typesense) apenas se o volume de perfis/tarefas o vier a justificar |
| Filas/Jobs | Necessário para: alertas de concursos, notificações, scraping agendado, envio de emails/WhatsApp — ex: BullMQ/worker dedicado |
| Notificações | Email + WhatsApp Business API + push (web) |
| Infra | Coolify/Dokploy (auto-hospedado), padrão já usado nos outros projectos Codebaz |
| Observabilidade | Logs centralizados, métricas básicas de erro/latência, alertas de falha nos jobs (scraper, notificações) |

### 11.2 Considerações críticas a decidir cedo
- **Multi-tenant de empresa:** modelar `organizations` + `organization_members` desde o início, para não migrar depois.
- **Geolocalização:** confirmar disponibilidade de PostGIS no ambiente Coolify actual ou adicionar a extensão.
- **Separação de domínios internos:** directório, tarefas, eventos e concursos podem crescer como módulos com forte acoplamento a `profiles` e `categories` — desenhar essas duas tabelas como núcleo estável desde já.
- **Rate limiting e anti-abuso na API** (Hono middleware) — importante assim que existir publicação aberta de tarefas/eventos.
- **Backups e recuperação de desastre:** rotina de backup do Postgres e plano de restauro testado, dado que perfis/reputação são o activo central do negócio.

### 11.3 Painel Administrativo (interno)
Ferramenta interna para a equipa Workdeal:
- Fila de verificação de perfis (aprovar/rejeitar documentos).
- Moderação de denúncias (perfis, tarefas, eventos, avaliações).
- Gestão manual de selos (atribuir/revogar).
- Visão geral de métricas-chave (secção 14).
- Gestão de concursos importados (rever/corrigir dados do scraper antes de publicar, se necessário).

---

## 12. Sistema de Selos — Detalhe

| Selo | Critério de atribuição | Tipo | Origem |
|---|---|---|---|
| **Verificado** | Identidade/NUIT/documento confirmado | Confiança | Manual |
| **Perfil Completo** | Todos os campos essenciais + portfólio | Qualidade | Automático |
| **Resposta Rápida** | Tempo médio de resposta abaixo de um limiar | Actividade | Automático |
| **Bem Avaliado** | Média de avaliações acima de X, mínimo N avaliações | Reputação | Automático |
| **Especialista em [categoria]** | Certificação/formação validada | Especialização | Manual |
| **Membro Activo da Rede** | Nº mínimo de conexões/interacções | Network | Automático |
| **Tarefas Concluídas** | Nº de tarefas concluídas com sucesso | Desempenho | Automático |
| **Certificado Workdeal** | Concluiu curso da Academia Workdeal | Especialização | Automático (pós-conclusão) |
| **Pro** | Assinante do plano premium | Comercial | Pago |
| **Em Destaque** | Selo temporário/promocional/editorial | Promocional | Manual |
| **Novo no Workdeal** | Perfil criado há menos de X dias | Informativo | Automático |

Regras gerais: selos automáticos devem ter critérios auditáveis e recalculados periodicamente (não apenas atribuídos uma vez); selos manuais precisam de fila de revisão no painel administrativo; selos pagos nunca devem substituir/mascarar a ausência de verificação real, para não corromper a confiança do sistema.

---

## 13. Modelo de Dados (alto nível)

- `profiles` (id, type, nome, descrição, categoria_id, coords, contactos, estado)
- `organizations` / `organization_members` (para perfis de empresa com vários utilizadores e papéis)
- `categories` (id, nome, categoria_pai_id)
- `badges` / `profile_badges` (origem: automático|manual|pago)
- `reviews` (id, profile_id, autor_id, nota, comentário, origem [directório|tarefa|evento])
- `connections` / `follows`
- `portfolio_items`
- `events` / `event_rsvps`
- `tasks` / `task_proposals` / `task_disputes`
- `tenders` / `tender_alerts` (já existente, a reaproveitar)
- `reports` (denúncias de perfis/tarefas/eventos/avaliações)
- `verification_requests` (documentos submetidos, estado, revisor)
- `notifications` (tipo, canal, estado de envio)

---

## 14. Métricas de Sucesso

**North Star:** conexões de valor por semana (secção 3.2).

Métricas de apoio:
- Nº de perfis criados/activos; taxa de perfis com ≥1 selo.
- Nº de pesquisas nearby; taxa de conversão pesquisa → contacto.
- Funil de Tarefas: publicadas → propostas → atribuídas → concluídas.
- Nº de eventos criados e inscrições; taxa de comparência.
- Nº de empresas subscritas a alertas de concursos; taxa de abertura.
- Retenção semanal/mensal por tipo de perfil.
- Tempo médio até verificação de perfil (operação interna).
- Taxa de denúncias resolvidas dentro do SLA interno.

---

## 15. Estratégia de Lançamento e Aquisição

- **Lançamento nacional desde o início:** a Workdeal arranca já com cobertura em todo o território moçambicano (decisão confirmada), não faseado por cidade.
- **Densidade por categoria, não por zona:** como o lançamento é nacional, a prioridade passa a ser garantir massa crítica de oferta em categorias-piloto de maior procura (ex: construção/manutenção, eventos, serviços administrativos) em cada província/cidade relevante, para evitar que zonas específicas do directório fiquem "vazias" mesmo com cobertura nacional activa.
- Aproveitar a base de leads já captada via Apify/Google Maps (Workdeals) para semear perfis em várias províncias simultaneamente, não só em Maputo.
- **Parcerias institucionais:** associações empresariais, câmaras de comércio, incubadoras — canal de aquisição em bloco de PMEs verificadas.
- **Aproveitar base já existente da Workdeals** (leads captados via Apify/Google Maps) como primeira leva de convites para criar perfil.
- **Concursos públicos como isco de aquisição:** alertas gratuitos de concursos são um forte gancho de aquisição para empresas, mesmo antes do directório atingir massa crítica.

---

## 16. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Directório "vazio" em algumas províncias (lançamento é nacional desde o início) | Priorizar densidade por categoria-piloto em cada província; importar leads já captados via scraping como convite inicial em várias zonas simultaneamente |
| Selos perderem credibilidade (percepção de "pago = confiável") | Separar claramente selos de confiança (verificação) dos comerciais (Pro); auditoria periódica |
| Avaliações falsas/manipuladas | Ligar avaliação a uma interacção real (tarefa/contacto); só o cliente avalia, o que reduz avaliações cruzadas de conveniência entre profissionais |
| Baixa adopção de Tarefas por desconfiança em pagar antes de existir escrow | Fase 1 sem transacção na plataforma, mas modelo de dados já preparado para activar comissão/pagamento sem re-arquitectura; introduzir escrow só quando houver confiança/volume |
| Dependência total da UFSA como única fonte de concursos | Decisão consciente de manter foco só na UFSA por agora; monitorização activa de falhas do scraper, já que não há fonte alternativa a compensar indisponibilidades |
| Equipa de operações não escalar ao ritmo do crescimento nacional | Equipa dedicada já existe desde o dia 1; definir SLA interno de verificação e rever capacidade à medida que o volume nacional cresce (não só Maputo) |

---

## 17. Roadmap Proposto

| Fase | Foco |
|---|---|
| **Fase 1 — MVP** | Perfis, directório com nearby, selos base, avaliações simples, Concursos Públicos com alertas, painel administrativo mínimo (verificação + moderação) |
| **Fase 2 — Network e Oportunidades** | Conexões, feed de actividade, Marketplace de Tarefas (RFQ/propostas), Eventos, WhatsApp Business, mais selos |
| **Fase 3 — Comunidade e Monetização** | Grupos por sector, fórum, blog, planos premium, selos pagos, comissão em tarefas, bilhetes de eventos, parcerias institucionais |
| **Fase 4 — Expansão** | Academia Workdeal, job board, multi-cidade/multi-província nacional, app móvel, API B2B para parceiros |

---

## 18. Decisões de Produto (Confirmadas)

| # | Tema | Decisão |
|---|---|---|
| 1 | Foco geográfico | Lançamento nacional (todo Moçambique) desde o início, não faseado por cidade |
| 2 | Verificação de documentos | Processo manual pela equipa de operações, que já tem capacidade dedicada |
| 3 | Avaliações | Só clientes avaliam profissionais/empresas — sem peer-review |
| 4 | Tarefas e transacção | Comissão/pagamento previsto na arquitectura desde já, mas sem transacção activa na Fase 1 |
| 5 | Criação de Eventos | Restrita a perfis verificados e aprovados |
| 6 | Equipa de moderação/verificação | Equipa dedicada existe desde o dia 1, separada da equipa de desenvolvimento |
| 7 | Fontes de Concursos Públicos | Apenas UFSA — sem agregação de outras fontes por agora |
| 8 | Motor de pesquisa | PostgreSQL full-text (`tsvector`/`pg_trgm`) |

## 19. Novas Questões em Aberto (decorrentes das decisões acima)

1. Com lançamento nacional desde o dia 1, qual o plano de distribuição da equipa de verificação/moderação por região — é centralizada ou vai precisar de revisores com conhecimento local por província?
2. Qual o SLA interno concreto (ex: 24h, 48h) para a verificação de perfis e de eventos, dado que a equipa já tem capacidade — vale a pena comunicá-lo publicamente como diferencial de confiança?
3. Sendo a UFSA a única fonte de concursos, existe algum plano de contingência caso o site/estrutura da UFSA mude e quebre o scraper (já que não há fonte alternativa a compensar)?
4. Para a comissão de Tarefas prevista mas não activa na Fase 1: qual o modelo a médio prazo — percentagem fixa, escalonada por valor, ou subscrição para acesso ilimitado a propostas?
5. Perfis não verificados podem continuar a usar Tarefas e o directório normalmente (só ficam sem poder criar Eventos), ou a verificação vai tornar-se obrigatória para mais funcionalidades ao longo do roadmap?