import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar | Workdeal Admin",
};

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

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0F1A2E] lg:flex-row">
      {/* Faixa institucional */}
      <aside className="hidden w-[38%] flex-col justify-between gap-16 px-10 py-10 lg:flex xl:px-14">
        <Wordmark />

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