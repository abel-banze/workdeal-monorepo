-- P: Rename badge slugs PT → EN (AGENTS §7)
UPDATE "badge" SET id='badge-verified', slug='verified' WHERE slug='verificado';
UPDATE "badge" SET id='badge-profile-complete', slug='profile-complete' WHERE slug='perfil-completo';
UPDATE "badge" SET id='badge-quick-response', slug='quick-response' WHERE slug='resposta-rapida';
UPDATE "badge" SET id='badge-highly-rated', slug='highly-rated' WHERE slug='bem-avaliado';
UPDATE "badge" SET id='badge-specialist', slug='specialist' WHERE slug='especialista';
UPDATE "badge" SET id='badge-active-member', slug='active-member' WHERE slug='membro-activo';
UPDATE "badge" SET id='badge-completed-tasks', slug='completed-tasks' WHERE slug='tarefas-concluidas';
UPDATE "badge" SET id='badge-msme', slug='msme' WHERE slug='mpme';
UPDATE "badge" SET id='badge-large-company', slug='large-company' WHERE slug='grande-empresa';
-- Garantir que novos slugs existem (idempotente, para DBs vazios)
INSERT INTO "badge" (id, slug, name, description, type, origin, criteria, is_active) VALUES
 ('badge-verified','verified','Verificado','Identidade/NUIT verificado pela equipa Workdeal','trust','manual','Documento NUIT/BI validado manualmente (SLA 48h)', true),
 ('badge-profile-complete','profile-complete','Perfil Completo','Todos os campos essenciais + portfólio ≥1 item','quality','automatic','name, description, category ≥1, logo/cover, contacto, portfólio ≥1', true),
 ('badge-quick-response','quick-response','Resposta Rápida','Tempo médio de resposta <2h nos últimos 30 dias','activity','automatic','p50 resposta <2h, mínimo 5 interacções em 30d', true),
 ('badge-highly-rated','highly-rated','Bem Avaliado','Média ≥4.3 com pelo menos 5 avaliações','reputation','automatic','avg rating ≥4.3, count ≥5', true),
 ('badge-specialist','specialist','Especialista','Certificação validada numa categoria','specialization','manual','Certificado/formação validado pela equipa', true),
 ('badge-active-member','active-member','Membro Activo','Rede activa com conexões e interacções','network','automatic','≥10 conexões ou ≥20 interacções em 90d', true),
 ('badge-completed-tasks','completed-tasks','Tarefas Concluídas','Histórico de tarefas concluídas com sucesso','performance','automatic','≥5 tarefas com avaliação ≥4', true),
 ('badge-msme','msme','MPME','Micro, Pequena ou Média Empresa classificada pelo IPEME','informational','automatic','Porte micro/pequena/média por nº trabalhadores', true),
 ('badge-large-company','large-company','Grande Empresa','Empresa de grande dimensão (>100 trabalhadores)','informational','automatic','Porte grande', true)
ON CONFLICT (id) DO NOTHING;
