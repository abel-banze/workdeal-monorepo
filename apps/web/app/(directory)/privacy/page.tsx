import type { Metadata } from "next";
import Link from "next/link";
import { Article, LegalCrossLink, LegalHeader, LegalIndex } from "../_components/legal-doc";

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

const linkCls =
  "font-semibold text-[#0B5E56] underline decoration-[#0B5E56]/40 underline-offset-4 transition-colors hover:decoration-[#0B5E56] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B5E56]";

export default function PrivacidadePage() {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-20 pt-12 sm:px-6">
      <LegalHeader
        label="Workdeal · Documento legal"
        title="Política de Privacidade"
        stampDate={UPDATED}
        meta={[
          ["Actualização", UPDATED],
          ["Âmbito", "workdeal.co.mz"],
          ["Contacto", "apoio@workdeal.co.mz"],
        ]}
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[250px_1fr] lg:gap-12">
        <LegalIndex sections={SECTIONS} />

        <div className="min-w-0 text-[15px] leading-[1.8] text-[#0F1A2E]/80 [&_strong]:text-[#0F1A2E]">
          <div className="divide-y divide-[#D9D2C2]">
            <Article id="responsavel" n="1" title="Responsável e âmbito">
              <p>
                A Workdeal é responsável pelo tratamento dos dados pessoais recolhidos na plataforma workdeal.co.mz.
                Esta Política explica que dados recolhemos, porquê e que direitos tem — em complemento dos{" "}
                <Link href="/terms" className={linkCls}>
                  Termos e Condições
                </Link>
                .
              </p>
            </Article>

            <Article id="dados" n="2" title="Dados que recolhemos">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li><strong>Conta:</strong> nome, email, palavra-passe (guardada de forma irreversível) e organizações a que pertence.</li>
                <li><strong>Perfil de empresa:</strong> nome, descrição, serviços, portfólio, localização e contactos (WhatsApp, telefone, email, website).</li>
                <li><strong>Verificação:</strong> registos de confirmação de contactos por código (OTP) e validações da equipa.</li>
                <li><strong>Actividade:</strong> tarefas publicadas, propostas, mensagens de negociação, avaliações e registos de acesso por segurança.</li>
                <li><strong>Pedidos à IA:</strong> o texto que envia ao assistente e os rascunhos gerados, usados para prestar o serviço.</li>
              </ul>
            </Article>

            <Article id="finalidades" n="3" title="Finalidades">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li>Criar e gerir contas, perfis e subscrições.</li>
                <li>Exibir o directório público e ligar oferta e procura (tarefas, propostas, negociação).</li>
                <li>Verificar contactos e prevenir fraude, spam e abuso.</li>
                <li>Melhorar a plataforma e prestar apoio ao utilizador.</li>
              </ul>
            </Article>

            <Article id="partilha" n="4" title="Partilha e visibilidade">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li><strong>Público por natureza:</strong> nome, descrição, serviços, avaliações e contactos verificados do perfil de empresa são visíveis a qualquer visitante.</li>
                <li><strong>Privado:</strong> credenciais, mensagens de negociação e dados de verificação nunca são públicos.</li>
                <li><strong>Prestadores:</strong> alojamento, envio de emails/notificações e processamento de IA, apenas na medida necessária.</li>
                <li>Não vendemos dados pessoais.</li>
              </ul>
            </Article>

            <Article id="conservacao" n="5" title="Conservação">
              <p>
                Conservamos os dados enquanto a conta existir e pelo período exigido por lei ou necessário para
                resolver litígios e garantir segurança. Perfis públicos deixam de ser exibidos após o encerramento da conta.
              </p>
            </Article>

            <Article id="direitos" n="6" title="Direitos do titular">
              <ul className="list-disc space-y-2 pl-5 marker:text-[#0B5E56]">
                <li>Aceder, rectificar e actualizar os seus dados no perfil e nas definições.</li>
                <li>Pedir a eliminação da conta e dos dados associados, nos termos da lei aplicável.</li>
                <li>Opor-se a utilizações para fins de comunicação directa.</li>
              </ul>
              <p>
                Para exercer estes direitos, escreva para <span className="font-semibold text-[#0F1A2E]">apoio@workdeal.co.mz</span>.
              </p>
            </Article>

            <Article id="seguranca" n="7" title="Segurança">
              <p>
                Aplicamos medidas técnicas e organizativas — encriptação em trânsito, controlo de acessos por papéis e
                verificação de contactos — para proteger os dados. Nenhum sistema é infalível; use palavras-passe fortes
                e não partilhe credenciais.
              </p>
            </Article>

            <Article id="cookies" n="8" title="Cookies e registos">
              <p>
                Usamos cookies estritamente necessários à sessão e à autenticação, além de registos técnicos anónimos
                para segurança e desempenho. Não usamos cookies de publicidade de terceiros.
              </p>
            </Article>

            <Article id="menores" n="9" title="Menores">
              <p>
                A plataforma destina-se a maiores de 18 anos. Contas identificadas como de menores serão encerradas.
              </p>
            </Article>

            <Article id="alteracoes" n="10" title="Alterações e contacto">
              <p>
                Actualizaremos esta Política quando necessário, com indicação da data. Questões de privacidade:{" "}
                <span className="font-semibold text-[#0F1A2E]">apoio@workdeal.co.mz</span>.
              </p>
            </Article>
          </div>

          <LegalCrossLink lead="Regras de utilização:" href="/terms" label="Termos e Condições" />
        </div>
      </div>
    </div>
  );
}
