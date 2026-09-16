import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos e Condições — Workdeal",
  description:
    "Termos e Condições de utilização da Workdeal: contas, perfis de empresa, verificação, tarefas, propostas, negociação, planos e utilização de IA.",
  openGraph: {
    title: "Termos e Condições — Workdeal",
    description: "Regras de utilização da plataforma Workdeal.",
    type: "article",
  },
};

const UPDATED = "15 de Setembro de 2026";

const SECTIONS = [
  { id: "objecto", n: "1", title: "Objecto e âmbito" },
  { id: "contas", n: "2", title: "Contas e elegibilidade" },
  { id: "perfis", n: "3", title: "Perfis de empresa e verificação" },
  { id: "tarefas", n: "4", title: "Tarefas, propostas e adjudicação" },
  { id: "negociacao", n: "5", title: "Negociação e conduta" },
  { id: "planos", n: "6", title: "Planos e pagamentos" },
  { id: "ia", n: "7", title: "Funcionalidades de IA" },
  { id: "conteudos", n: "8", title: "Conteúdos e propriedade" },
  { id: "suspensao", n: "9", title: "Suspensão e cessação" },
  { id: "responsabilidade", n: "10", title: "Responsabilidade" },
  { id: "alteracoes", n: "11", title: "Alterações aos Termos" },
  { id: "contactos", n: "12", title: "Contactos e lei aplicável" },
] as const;

export default function TermosPage() {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-10 sm:px-6">
      <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">WORKDEAL · DOCUMENTO LEGAL</p>
      <h1
        className="mt-2 max-w-[640px] text-[28px] font-black leading-tight tracking-tight text-[#0F1A2E] sm:text-[36px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Termos e Condições
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
          <section id="objecto" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">1</span>Objecto e âmbito
            </h2>
            <p className="mt-2">
              A Workdeal é uma plataforma digital que liga empresas e profissionais a oportunidades de negócio:
              directório de perfis verificados, requisições (tarefas), propostas, negociação, eventos e concursos.
              Estes Termos regulam o acesso e a utilização da plataforma em workdeal.co.mz. Ao criar conta ou
              utilizar qualquer funcionalidade, concorda com estes Termos e com a{" "}
              <Link href="/privacy" className="font-semibold text-[#0B5E56] underline underline-offset-2">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section id="contas" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">2</span>Contas e elegibilidade
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Só pode registar-se quem tenha pelo menos 18 anos e actue em nome próprio ou de uma empresa que represente.</li>
              <li>É responsável por manter as credenciais confidenciais e por toda a actividade da sua conta.</li>
              <li>Deve fornecer informação verídica e mantê-la actualizada; contas com dados falsos podem ser suspensas.</li>
              <li>Cada pessoa pode ter uma conta pessoal; empresas gerem o acesso por organização, com papéis (dono, admin, editor, membro).</li>
            </ul>
          </section>

          <section id="perfis" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">3</span>Perfis de empresa e verificação
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>O perfil público (nome, serviços, portfólio, contactos verificados) é a montra da empresa no directório.</li>
              <li>Contactos (WhatsApp, telefone, email) são confirmados por código de verificação (OTP); só contactos verificados ganham selo público.</li>
              <li>A equipa Workdeal pode validar perfis e atribuir selos de verificação; o selo pode ser retirado se a informação deixar de ser válida.</li>
              <li>Não publique conteúdos falsos, enganosos, ofensivos ou que violem direitos de terceiros.</li>
            </ul>
          </section>

          <section id="tarefas" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">4</span>Tarefas, propostas e adjudicação
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Quem publica uma tarefa deve descrever com clareza o âmbito, o orçamento indicativo, o local e os prazos.</li>
              <li>Propostas devem reflectir capacidade real de execução; valores e prazos indicados vinculam o proponente na negociação.</li>
              <li>A adjudicação regista o acordo (valor e prazo) entre as partes; a execução e o pagamento decorrem fora da plataforma, salvo indicação em contrário.</li>
              <li>A Workdeal não é parte nos contratos entre utilizadores nem garante a execução dos trabalhos.</li>
            </ul>
          </section>

          <section id="negociacao" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">5</span>Negociação e conduta
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>O chat de negociação é o canal previsto para acordar preço, prazo e âmbito antes da adjudicação.</li>
              <li>Por segurança, mensagens com contactos directos (telefone, email, links) são bloqueadas automaticamente.</li>
              <li>São proibidos spam, assédio, fraude, burla e qualquer uso ilícito da plataforma.</li>
              <li>Avaliações devem reflectir experiências reais; avaliações falsas ou pagas podem ser removidas.</li>
            </ul>
          </section>

          <section id="planos" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">6</span>Planos e pagamentos
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>O registo base é gratuito; funcionalidades avançadas (destaques, IA, limites alargados) exigem subscrição.</li>
              <li>Preços, ciclos e limites de cada plano são apresentados antes da contratação e podem ser alterados com aviso prévio.</li>
              <li>Em caso de cancelamento, mantém o acesso pago até ao fim do ciclo em curso, salvo disposição legal em contrário.</li>
            </ul>
          </section>

          <section id="ia" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">7</span>Funcionalidades de IA
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>O assistente comercial, os rascunhos de propostas e respostas e o assistente de perfil geram textos de apoio — são rascunhos a rever, não aconselhamento profissional.</li>
              <li>As respostas de IA podem conter erros; confirme sempre factos, valores e prazos antes de enviar ou adjudicar.</li>
              <li>Não introduza dados sensíveis de terceiros nos pedidos à IA.</li>
            </ul>
          </section>

          <section id="conteudos" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">8</span>Conteúdos e propriedade
            </h2>
            <p className="mt-2">
              Mantém os direitos sobre os conteúdos que publica e concede à Workdeal uma licença para os exibir na
              plataforma. A marca, o design e o software da Workdeal pertencem aos seus titulares e não podem ser
              copiados sem autorização.
            </p>
          </section>

          <section id="suspensao" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">9</span>Suspensão e cessação
            </h2>
            <p className="mt-2">
              Podemos suspender ou remover contas e conteúdos que violem estes Termos, designadamente por fraude,
              falsidade, spam ou abuso. Pode encerrar a sua conta a qualquer momento; perfis públicos deixam de ser
              exibidos após o encerramento.
            </p>
          </section>

          <section id="responsabilidade" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">10</span>Responsabilidade
            </h2>
            <p className="mt-2">
              A plataforma é fornecida “como está”. Na máxima medida permitida por lei, a Workdeal não responde por
              danos decorrentes de negócios entre utilizadores, indisponibilidades temporárias ou conteúdos de terceiros.
            </p>
          </section>

          <section id="alteracoes" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">11</span>Alterações aos Termos
            </h2>
            <p className="mt-2">
              Podemos actualizar estes Termos; alterações relevantes serão comunicadas na plataforma com antecedência
              razoável. A utilização continuada após a entrada em vigor vale como aceitação.
            </p>
          </section>

          <section id="contactos" className="scroll-mt-6">
            <h2 className="text-lg font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              <span className="mr-2 font-mono text-sm text-[#0B5E56]">12</span>Contactos e lei aplicável
            </h2>
            <p className="mt-2">
              Dúvidas sobre estes Termos: <span className="font-semibold text-[#0F1A2E]">apoio@workdeal.co.mz</span>.
              Aplicam-se as leis da República de Moçambique.
            </p>
          </section>

          <div className="rounded-[16px] border border-[#0B5E56]/20 bg-[#0B5E56]/5 px-5 py-4 text-[13px]">
            <p className="font-bold text-[#0F1A2E]">Como tratamos os seus dados?</p>
            <p className="mt-1">
              Leia também a{" "}
              <Link href="/privacy" className="font-semibold text-[#0B5E56] underline underline-offset-2">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
