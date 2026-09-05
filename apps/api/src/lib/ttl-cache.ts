/**
 * TTL cache em memória para dados de referência (read-heavy, quase estáticos).
 * - Evita round-trips à BD em cada pedido quando a tabela é pequena e muda pouco.
 * - Concorrência: só um `loader` em voo (thundering-herd) — varios pedidos
 *   simultâneos com a cache fria fazem UMA query.
 * - Erro: nunca é cacheado; se já existir valor anterior fica stale-while-error
 *   e a cache re-tenta no pedido seguinte.
 */
export function ttlCache<T>(loader: () => Promise<T>, ttlMs: number) {
  let cached: { value: T; at: number } | null = null;
  let inflight: Promise<T> | null = null;

  return (): Promise<T> => {
    const now = Date.now();
    if (cached && now - cached.at < ttlMs) return Promise.resolve(cached.value);

    if (inflight) return inflight;

    inflight = loader()
      .then((value) => {
        cached = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };
}