"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="font-medium">Erro ao carregar</h2>
      <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      <button onClick={reset} className="mt-4 border px-4 py-2 text-sm">
        Tentar novamente
      </button>
    </div>
  );
}
