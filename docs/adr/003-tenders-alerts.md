# ADR-003 — Concursos Públicos (Tenders) e Alertas

| | |
|---|---|
| Estado | Aceite |
| Domínio | Backend — Tenders & Notifications |
| Data | Agosto 2026 |
| Decisores | Equipa Workdeal |

## Contexto
PRD 7.3 define UFSA como fonte única e definitiva. Scraper já existe noutro projecto Workdeals (Apify/Google Maps) mas sem contrato estável. Falha do scraper sem fallback deixa empresas sem alertas — risco comercial.

## Decisões

### 1. Modelo de dados
- `tenders(id, sourceId UNIQUE, fonte='UFSA', title, description, categoryId, province, deadline, sourceUrl, rawJson, status)` — `sourceId` é id estável da UFSA.
- `tender_alerts(id, userId, categoryId?, province?, deadlineBefore?, channel, isActive)` — preferências do utilizador.
- `notifications(id, userId, tenderId?, channel, status, sentAt)` — fila de envio.

### 2. Worker BullMQ dedicado
- Job `scrape-ufsa` corre a cada 30m, idempotente por `sourceId` (`ON CONFLICT DO UPDATE`).
- Checksum `rawJson` — só notifica se conteúdo mudou.
- Falha 3x → alerta `logger.error` + `notifications` de sistema para Ops.

### 3. Fila de notificações
- Job `dispatch-alerts` após cada scrape: resolve `tender_alerts` → enfileira `notifications` por canal (email, WhatsApp via API, Telegram).
- `revalidate 5-10m` na página de tender, alinhado à cadência do scraper (AGENTS.md 2.2).

### 4. Painel admin
- Revisão manual antes de publicar (corrigir dados do scraper) + import CSV fallback se UFSA mudar HTML.
- Métrica: `tender_alert_open_rate`.

## Consequências
- Fonte única mantida, mas com mitigação (health-check + CSV).
- Arquitectura pronta para múltiplas fontes futuras (`tenders.fonte` já existe).
