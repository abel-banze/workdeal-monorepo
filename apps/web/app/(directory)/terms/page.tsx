import type { Metadata } from "next";
import Link from "next/link";
import { Article, LegalCrossLink, LegalHeader, LegalIndex } from "../_components/legal-doc";

export const metadata: Metadata = {
  title: "Termos e Condições",
  description:
    "Termos e Condições de utilização da Workdeal: contas, perfis de empresa, verificação, tarefas, propostas, negociação, planos e utilização de IA.",
  openGraph: {
title: "Termos e Condições",
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

const linkCls =
  "font-semibold text-[#0B5E56] underline decoration-[#0B5E56]/40 underline-offset-4 transition-colors hover:decoration-[#0B5E56] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B5E56]";

export default function TermosPage() {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-20 pt-12 sm:px-6">
      <LegalHeader
        label="Workdeal · Documento legal"
        title="Termos e Condições"
        stampDate={UPDATED}
        meta={[
          ["Actualização", UPDATED],
          ["Âmbito", "workdeal.co.mz"],
          ["Lei aplicável", "Moçambique"],
        ]}
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[250px_1fr] lg:gap-12">
        <LegalIndex sections={SECTIONS} />

        <div className="min-w-0 text-[15px] leading-[1.8] text-[#0F1A2E]/80 [&_strong]:text-[#0F1A2E]">
          <div className="divide-y divide-[#D9D2C2]">
            <Article id="objecto" n="1" title="Objecto e âmbito">
              <p>
                A Workdeal é uma plataforma digital que liga empresas e profissionais a oportunidades de negócio:
                directório de perfis verificados, requisições (tarefas), propostas, negociação, eventos e concursos.
                Estes Termos regulam o acesso e a utilização da plataforma em workdeal.co.mz. Ao criar conta ou
                utilizar qualquer funcionalidade, concorda com estes Termos e com a{" "}
                <Link href="/privacy" className={linkCls}>
                  Política de Privacidade
                </Link>
                .
              </p>
            </Article>

            <Article id="contas" n="2" title="Contas e elegibilidade">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li>Só pode registar-se quem tenha pelo menos 18 anos e actue em nome próprio ou de uma empresa que represente.</li>
                <li>É responsável por manter as credenciais confidenciais e por toda a actividade da sua conta.</li>
                <li>Deve fornecer informação verídica e mantê-la actualizada; contas com dados falsos podem ser suspensas.</li>
                <li>Cada pessoa pode ter uma conta pessoal; empresas gerem o acesso por organização, com papéis (dono, admin, editor, membro).</li>
              </ul>
            </Article>

            <Article id="perfis" n="3" title="Perfis de empresa e verificação">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li>O perfil público (nome, serviços, portfólio, contactos verificados) é a montra da empresa no directório.</li>
                <li>Contactos (WhatsApp, telefone, email) são confirmados por código de verificação (OTP); só contactos verificados ganham selo público.</li>
                <li>A equipa Workdeal pode validar perfis e atribuir selos de verificação; o selo pode ser retirado se a informação deixar de ser válida.</li>
                <li>Não publique conteúdos falsos, enganosos, ofensivos ou que violem direitos de terceiros.</li>
              </ul>
            </Article>

            <Article id="tarefas" n="4" title="Tarefas, propostas e adjudicação">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li>Quem publica uma tarefa deve descrever com clareza o âmbito, o orçamento indicativo, o local e os prazos.</li>
                <li>Propostas devem reflectir capacidade real de execução; valores e prazos indicados vinculam o proponente na negociação.</li>
                <li>A adjudicação regista o acordo (valor e prazo) entre as partes; a execução e o pagamento decorrem fora da plataforma, salvo indicação em contrário.</li>
                <li>A Workdeal não é parte nos contratos entre utilizadores nem garante a execução dos trabalhos.</li>
              </ul>
            </Article>

            <Article id="negociacao" n="5" title="Negociação e conduta">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li>O chat de negociação é o canal previsto para acordar preço, prazo e âmbito antes da adjudicação.</li>
                <li>Por segurança, mensagens com contactos directos (telefone, email, links) são bloqueadas automaticamente.</li>
                <li>São proibidos spam, assédio, fraude, burla e qualquer uso ilícito da plataforma.</li>
                <li>Avaliações devem reflectir experiências reais; avaliações falsas ou pagas podem ser removidas.</li>
              </ul>
            </Article>

            <Article id="planos" n="6" title="Planos e pagamentos">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li>O registo base é gratuito; funcionalidades avançadas (destaques, IA, limites alargados) exigem subscrição.</li>
                <li>Preços, ciclos e limites de cada plano são apresentados antes da contratação e podem ser alterados com aviso prévio.</li>
                <li>Em caso de cancelamento, mantém o acesso pago até ao fim do ciclo em curso, salvo disposição legal em contrário.</li>
              </ul>
            </Article>

            <Article id="ia" n="7" title="Funcionalidades de IA">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li>O assistente comercial, os rascunhos de propostas e respostas e o assistente de perfil geram textos de apoio — são rascunhos a rever, não aconselhamento profissional.</li>
                <li>As respostas de IA podem conter erros; confirme sempre factos, valores e prazos antes de enviar ou adjudicar.</li>
                <li>Não introduza dados sensíveis de terceiros nos pedidos à IA.</li>
              </ul>
            </Article>

            <Article id="conteudos" n="8" title="Conteúdos e propriedade">
              <p>
                Mantém os direitos sobre os conteúdos que publica e concede à Workdeal uma licença para os exibir na
                plataforma. A marca, o design e o software da Workdeal pertencem aos seus titulares e não podem ser
                copiados sem autorização.
              </p>
            </Article>

            <Article id="suspensao" n="9" title="Suspensão e cessação">
              <p>
                Podemos suspender ou remover contas e conteúdos que violem estes Termos, designadamente por fraude,
                falsidade, spam ou abuso. Pode encerrar a sua conta a qualquer momento; perfis públicos deixam de ser
                exibidos após o encerramento.
              </p>
            </Article>

            <Article id="responsabilidade" n="10" title="Responsabilidade">
              <p>
                A plataforma é fornecida “como está”. Na máxima medida permitida por lei, a Workdeal não responde por
                danos decorrentes de negócios entre utilizadores, indisponibilidades temporárias ou conteúdos de terceiros.
              </p>
            </Article>

            <Article id="alteracoes" n="11" title="Alterações aos Termos">
              <p>
                Podemos actualizar estes Termos; alterações relevantes serão comunicadas na plataforma com antecedência
                razoável. A utilização continuada após a entrada em vigor vale como aceitação.
              </p>
            </Article>

            <Article id="contactos" n="12" title="Contactos e lei aplicável">
              <p>
                Dúvidas sobre estes Termos: <span className="font-semibold text-[#0F1A2E]">apoio@workdeal.co.mz</span>.
                Aplicam-se as leis da República de Moçambique.
              </p>
            </Article>
          </div>

          <LegalCrossLink lead="Como tratamos os seus dados?" href="/privacy" label="Política de Privacidade" />
        </div>
      </div>
    </div>
  );
}
