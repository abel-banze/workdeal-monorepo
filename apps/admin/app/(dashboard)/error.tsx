"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Erro no dashboard</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="text-sm underline">Tentar novamente</button>
    </div>
  );
}
