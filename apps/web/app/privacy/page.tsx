import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade — Workdeal",
  description:
    "Política de Privacidade da Workdeal: que dados recolhemos, para que finalidades, partilha, conservação, direitos do titular e contactos.",
  openGraph: {
    title: "Política de Privacidade — Workdeal",
    description: "Como a Workdeal trata os seus dados.",
    type: "article",
  },
};

const UPDATED = "15 de Setembro de 2026";

const SECTIONS = [
  { id: "responsavel", n: "1", title: "Responsável e âmbito" },
  { id: "dados", n: "2", title: "Dados que recolhemos" },
  { id: "finalidades", n: "3", title: "Finalidades" },
  { id: "partilha", n: "4", title: "Partilha e visibilidade" },
  { id: "conservacao", n: "5", title: "Conservação" },
  { id: "direitos", n: "6", title: "Direitos do titular" },
  { id: "seguranca", n: "7", title: "Segurança" },
  { id: "cookies", n: "8", title: "Cookies e registos" },
  { id: "menores", n: "9", title: "Menores" },
  { id: "alteracoes", n: "10", title: "Alterações e contacto" },
] as const;

export default function PrivacidadePage() {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-10 sm:px-6">
      <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">WORKDEAL · DOCUMENTO LEGAL</p>
      <h1
        className="mt-2 max-w-[640px] text-[28px] font-black leading-tight tracking-tight text-[#0F1A2E] sm:text-[36px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-[#0F1A2E]/60">Última actualização: {UPDATED}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Índice" className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[16px] border border-[#D9D2C2] bg-white p-3">
            <ol className="space-y-0.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-[#0F1A2E]/70 hover:bg-[#F6F3EE] hover:text-[#0B5E56]"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-[#0B5E56]">{s.n}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0 space-y-8 text-[14px] leading-relaxed text-[#0F1A2E]/80">
          <section id="responsavel" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">1</span>Responsável e âmbito
            </h2>
            <p className="mt-2">
              A Workdeal é responsável pelo tratamento dos dados pessoais recolhidos na plataforma workdeal.co.mz.
              Esta Política explica que dados recolhemos, porquê e que direitos tem — em complemento dos{" "}
              <Link href="/terms" className="font-semibold text-[#0B5E56] underline underline-offset-2">
                Termos e Condições
              </Link>
              .
            </p>
          </section>

          <section id="dados" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">2</span>Dados que recolhemos
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>Conta:</strong> nome, email, palavra-passe (guardada de forma irreversível) e organizações a que pertence.</li>
              <li><strong>Perfil de empresa:</strong> nome, descrição, serviços, portfólio, localização e contactos (WhatsApp, telefone, email, website).</li>
              <li><strong>Verificação:</strong> registos de confirmação de contactos por código (OTP) e validações da equipa.</li>
              <li><strong>Actividade:</strong> tarefas publicadas, propostas, mensagens de negociação, avaliações e registos de acesso por segurança.</li>
              <li><strong>Pedidos à IA:</strong> o texto que envia ao assistente e os rascunhos gerados, usados para prestar o serviço.</li>
            </ul>
          </section>

          <section id="finalidades" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">3</span>Finalidades
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Criar e gerir contas, perfis e subscrições.</li>
              <li>Exibir o directório público e ligar oferta e procura (tarefas, propostas, negociação).</li>
              <li>Verificar contactos e prevenir fraude, spam e abuso.</li>
              <li>Melhorar a plataforma e prestar apoio ao utilizador.</li>
            </ul>
          </section>

          <section id="partilha" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">4</span>Partilha e visibilidade
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>Público por natureza:</strong> nome, descrição, serviços, avaliações e contactos verificados do perfil de empresa são visíveis a qualquer visitante.</li>
              <li><strong>Privado:</strong> credenciais, mensagens de negociação e dados de verificação nunca são públicos.</li>
              <li><strong>Prestadores:</strong> alojamento, envio de emails/notificações e processamento de IA, apenas na medida necessária.</li>
              <li>Não vendemos dados pessoais.</li>
            </ul>
          </section>

          <section id="conservacao" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">5</span>Conservação
            </h2>
            <p className="mt-2">
              Conservamos os dados enquanto a conta existir e pelo período exigido por lei ou necessário para
              resolver litígios e garantir segurança. Perfis públicos deixam de ser exibidos após o encerramento da conta.
            </p>
          </section>

          <section id="direitos" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">6</span>Direitos do titular
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Aceder, rectificar e actualizar os seus dados no perfil e nas definições.</li>
              <li>Pedir a eliminação da conta e dos dados associados, nos termos da lei aplicável.</li>
              <li>Opor-se a utilizações para fins de comunicação directa.</li>
            </ul>
            <p className="mt-2">
              Para exercer estes direitos, escreva para <span className="font-semibold text-[#0F1A2E]">apoio@workdeal.co.mz</span>.
            </p>
          </section>

          <section id="seguranca" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">7</span>Segurança
            </h2>
            <p className="mt-2">
              Aplicamos medidas técnicas e organizativas — encriptação em trânsito, controlo de acessos por papéis e
              verificação de contactos — para proteger os dados. Nenhum sistema é infalível; use palavras-passe fortes
              e não partilhe credenciais.
            </p>
          </section>

          <section id="cookies" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">8</span>Cookies e registos
            </h2>
            <p className="mt-2">
              Usamos cookies estritamente necessários à sessão e à autenticação, além de registos técnicos anónimos
              para segurança e desempenho. Não usamos cookies de publicidade de terceiros.
            </p>
          </section>

          <section id="menores" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">9</span>Menores
            </h2>
            <p className="mt-2">
              A plataforma destina-se a maiores de 18 anos. Contas identificadas como de menores serão encerradas.
            </p>
          </section>

          <section id="alteracoes" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">10</span>Alterações e contacto
            </h2>
            <p className="mt-2">
              Actualizaremos esta Política quando necessário, com indicação da data. Questões de privacidade:{" "}
              <span className="font-semibold text-[#0F1A2E]">apoio@workdeal.co.mz</span>.
            </p>
          </section>

          <div className="rounded-[16px] border border-[#0B5E56]/20 bg-[#0B5E56]/5 px-5 py-4 text-[13px]">
            <p className="font-bold text-[#0F1A2E]">Regras de utilização</p>
            <p className="mt-1">
              Consulte também os{" "}
              <Link href="/terms" className="font-semibold text-[#0B5E56] underline underline-offset-2">
                Termos e Condições
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
