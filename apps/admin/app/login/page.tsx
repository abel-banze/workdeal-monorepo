import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar | Workdeal Admin",
};

// Capitais provinciais de Moçambique com coordenadas reais.
// Posicionamento no SVG (viewBox 100×112): y = (lat + 11.5) × 7.06 ; x = (lon − 30.2) × 9.35
const CAPITALS = [
  { name: "Pemba", code: "CD", lat: -12.97, lon: 40.51, x: 96.4, y: 10.4 },
  { name: "Lichinga", code: "NS", lat: -13.31, lon: 35.24, x: 47.1, y: 12.8 },
  { name: "Nampula", code: "NP", lat: -15.12, lon: 39.27, x: 84.8, y: 25.6 },
  { name: "Tete", code: "TT", lat: -16.16, lon: 33.59, x: 31.7, y: 32.9 },
  { name: "Quelimane", code: "ZB", lat: -17.88, lon: 36.88, x: 62.5, y: 45.0 },
  { name: "Chimoio", code: "MA", lat: -19.11, lon: 33.48, x: 30.7, y: 53.7 },
  { name: "Beira", code: "SF", lat: -19.83, lon: 34.84, x: 43.4, y: 58.8 },
  { name: "Inhambane", code: "IN", lat: -23.87, lon: 35.38, x: 48.4, y: 87.3 },
  { name: "Xai-Xai", code: "GA", lat: -25.05, lon: 33.75, x: 33.2, y: 95.7 },
  { name: "Maputo", code: "MP", lat: -25.97, lon: 32.57, x: 22.2, y: 102.1 },
] as const;

// Linhas de latitude de referência
const HAIRLINES = [-13, -17, -21, -25].map((lat) => ({ lat, y: (lat + 11.5) * 7.06 }));

const DISPLAY = { fontFamily: "var(--font-display)" } as const;

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#F6F3EE] text-[15px] font-black tracking-[-0.03em] text-[#0F1A2E] shadow-sm">
        W
      </div>
      <div className="leading-none">
        <span className="block text-lg font-black tracking-[-0.04em] text-white" style={DISPLAY}>
          Workdeal
        </span>
        <span className="mt-1 block font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">
          Admin
        </span>
      </div>
    </div>
  );
}

function CoverageMap() {
  return (
    <svg viewBox="0 0 100 112" className="w-full" role="img" aria-label="Mapa de pontos com as dez capitais provinciais de Moçambique">
      {HAIRLINES.map((h) => (
        <g key={h.lat}>
          <line x1="0" x2="100" y1={h.y} y2={h.y} stroke="rgba(255,255,255,0.09)" strokeWidth="0.5" strokeDasharray="1 5" />
          <text x="1" y={h.y - 2} fill="rgba(255,255,255,0.28)" fontSize="4.5" fontWeight={700} style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
            {h.lat}°
          </text>
        </g>
      ))}
      <text x="94" y="8" fill="rgba(255,255,255,0.35)" fontSize="5" fontWeight={700} style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
        N
      </text>
      {CAPITALS.map((c) => (
        <circle key={c.name} cx={c.x} cy={c.y} r="3.4" fill="#4FD1C5" />
      ))}
      {/* Sede — único ponto "vivo" */}
      <circle cx={CAPITALS[9].x} cy={CAPITALS[9].y} r="6.5" fill="#4FD1C5" fillOpacity="0.18" className="animate-pulse motion-reduce:animate-none" />
      <circle cx={CAPITALS[9].x} cy={CAPITALS[9].y} r="3.2" fill="#4FD1C5" />
    </svg>
  );
}

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  const north = CAPITALS.slice(0, 5);
  const south = CAPITALS.slice(5);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0F1A2E] lg:flex-row">
      {/* Mural — mesa de controlo nacional */}
      <aside className="hidden w-[42%] flex-col justify-between gap-12 overflow-hidden px-10 py-10 lg:flex xl:px-14">
        <Wordmark />

        <div className="flex flex-col gap-10">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#4FD1C5]">
              Sistema de gestão Workdeal
            </p>
            <h1
              className="mt-4 max-w-[14ch] text-[30px] font-black leading-[1.02] tracking-[-0.04em] text-white xl:text-[36px]"
              style={DISPLAY}
            >
              O trabalho de Moçambique num único lugar.
            </h1>
            <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-white/55">
              Painel de equipa para moderar perfis, aprovar tarefas e acompanhar o mercado, de Pemba a Maputo.
            </p>
          </div>

          <div>
            <div
              className="mx-auto max-w-[280px] p-4"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            >
              <CoverageMap />
            </div>
            <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              Cobertura nacional · 10 províncias
            </p>
            <div className="mt-4 grid max-w-[430px] grid-cols-2 gap-x-10 gap-y-2.5 border-t border-white/10 pt-4">
              {[north, south].map((group, i) => (
                <div key={i} className="flex flex-col gap-2.5">
                  {group.map((c) => (
                    <div key={c.name} className="flex items-center gap-2.5">
                      <span className="size-1.5 rounded-full bg-[#4FD1C5]" />
                      <span className="text-[13px] font-medium text-white/85">{c.name}</span>
                      <span className="ml-auto font-mono text-[10px] font-bold tracking-[0.08em] text-white/35">
                        {c.code}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[11px] text-white/35">
          <span>© {new Date().getFullYear()} Workdeal · Maputo, Moçambique</span>
          <span className="tracking-[0.18em] uppercase">Painel interno</span>
        </p>
      </aside>

      {/* Cartão de entrada sobre papel */}
      <section className="flex flex-1 flex-col justify-center bg-[#F6F3EE] px-6 py-14 sm:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0F1A2E] text-[15px] font-black tracking-[-0.03em] text-white">
              W
            </div>
            <div className="leading-none">
              <span className="block text-lg font-black tracking-[-0.04em] text-[#0F1A2E]" style={DISPLAY}>
                Workdeal
              </span>
              <span className="mt-1 block font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#0F1A2E]/50">
                Admin
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9D2C2] bg-white p-8 shadow-[0_24px_60px_-24px_rgba(15,26,46,0.35)] sm:p-9">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
              Acesso restrito
            </p>
            <h2
              className="mt-3 text-[28px] font-black leading-[0.98] tracking-[-0.04em] text-[#0F1A2E]"
              style={DISPLAY}
            >
              Entrar no painel
            </h2>
            <p className="mt-2 text-sm text-[#0F1A2E]/55">Usa o email da equipa Workdeal para continuar.</p>
            <div className="mt-8">
              <LoginForm />
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-[#0F1A2E]/45">
            Só moderadores e administradores têm acesso ao painel de gestão.
          </p>
        </div>
      </section>
    </div>
  );
}