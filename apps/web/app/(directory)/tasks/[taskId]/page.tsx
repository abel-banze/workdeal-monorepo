import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicTask } from "@/lib/directory";
import { getCategories } from "@/lib/profiles";
import { getServerSession } from "@/lib/auth";
import { formatMzn, formatDeadline, formatFull } from "@/lib/dates";
import { TASK_STATUS_LABELS_PT } from "@workdeal/shared";
import { TaskProposalForm } from "@/components/features/task-proposal-form";

export const revalidate = 0;

type Props = { params: Promise<{ taskId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taskId } = await params;
  try {
    const { data } = await getPublicTask(taskId);
    if (!data) return { title: "Requisição — Workdeal" };
    return {
      title: `${data.title} — Workdeal`,
      description: data.description.slice(0, 160),
    };
  } catch {
    return { title: "Requisição — Workdeal" };
  }
}

export default async function PublicTaskPage({ params }: Props) {
  const { taskId } = await params;
  const session = await getServerSession().catch(() => null);

  let task;
  try {
    const res = await getPublicTask(taskId);
    task = res.data;
  } catch {
    task = null;
  }
  if (!task) notFound();

  const catsRes = await getCategories().catch(() => ({ data: [] as { id: string; name: string }[] }));
  const cats = (catsRes as { data: { id: string; name: string }[] }).data;
  const categoryName = task.categoryId ? cats.find((c) => c.id === task.categoryId)?.name ?? null : null;

  const proposable = task.status === "open" || task.status === "in_review";
  const requesterHref = task.requesterProfileSlug ? `/profiles/${task.requesterProfileSlug}` : null;

  return (
    <div className="bg-[#F6F3EE]">
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.14em]">
          <Link href="/" className="text-[#0F1A2E]/40 hover:text-[#0F1A2E]">
            Início
          </Link>
          <span className="text-[#D9D2C2]">/</span>
          <Link href="/tasks" className="text-[#0F1A2E]/40 hover:text-[#0F1A2E]">
            Requisições
          </Link>
          <span className="text-[#D9D2C2]">/</span>
          <span className="text-[#0B5E56]">PEDIDO</span>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#0F1A2E] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                {TASK_STATUS_LABELS_PT[task.status]}
              </span>
              {categoryName ? (
                <span className="rounded-full border border-[#D9D2C2] bg-white px-3 py-1 text-[11px] font-medium text-[#0F1A2E]/70">
                  {categoryName}
                </span>
              ) : null}
            </div>

            <h1
              className="mt-4 text-[34px] font-black leading-[0.95] tracking-[-0.04em] text-[#0F1A2E] sm:text-[44px]"
              style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
            >
              {task.title}
            </h1>

            {requesterHref && task.requesterProfileName ? (
              <Link href={requesterHref} className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-[#D9D2C2] bg-white px-4 py-3 hover:border-[#0B5E56]/30">
                <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] text-xs font-black text-[#0F1A2E]">
                  {task.requesterProfileLogo ? (
                    <Image src={task.requesterProfileLogo} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    task.requesterProfileName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="text-left">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0F1A2E]/45">Pedido por</span>
                  <span className="block text-sm font-black text-[#0F1A2E]">{task.requesterProfileName}</span>
                </span>
              </Link>
            ) : task.requesterProfileName ? (
              <p className="mt-5 text-sm text-[#0F1A2E]/60">
                Pedido por <span className="font-bold text-[#0F1A2E]">{task.requesterProfileName}</span>
              </p>
            ) : null}

            <div className="mt-6 grid gap-4 rounded-[20px] border border-[#D9D2C2] bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">Orçamento</p>
                <p className="mt-1 text-sm font-black text-[#0F1A2E]">{formatBudget(task.priceMinMzn, task.priceMaxMzn)}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">Local</p>
                <p className="mt-1 text-sm font-black text-[#0F1A2E]">{[task.province, task.district].filter(Boolean).join(" · ") || "A combinar"}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">Prazo</p>
                <p className="mt-1 text-sm font-black text-[#0F1A2E]">{task.dueAt ? formatDeadline(task.dueAt).replace("Prazo: ", "").replace("Prazo passou: ", "") : "Sem prazo"}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">Publicado</p>
                <p className="mt-1 text-sm font-black text-[#0F1A2E]">{formatFull(task.createdAt)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[20px] border border-[#D9D2C2] bg-white p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">SOBRE O PEDIDO</p>
              <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#0F1A2E]/80">{task.description}</p>
            </div>
          </article>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/40">ACÇÃO</p>
              <h2 className="mt-2 text-lg font-black tracking-tight text-[#0F1A2E]">Pode resolver este pedido?</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#0F1A2E]/60">
                {proposable
                  ? "Envie a sua proposta directamente ao solicitante — sem intermediários."
                  : `Esta tarefa está com o estado "${TASK_STATUS_LABELS_PT[task.status]}".`}
              </p>

              <div className="mt-4">
                {!proposable ? (
                  <div className="rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-5 py-4 text-center text-sm font-bold text-[#0F1A2E]/50">
                    Requisição {TASK_STATUS_LABELS_PT[task.status].toLowerCase()}
                  </div>
                ) : !session ? (
                  <div className="space-y-2">
                    <Link
                      href={`/login?next=${encodeURIComponent(`/tasks/${task.id}`)}`}
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#0B5E56] px-6 text-sm font-bold text-white hover:bg-[#094d46] transition-colors"
                    >
                      Iniciar sessão para propor
                    </Link>
                    <p className="text-center text-[11px] text-[#0F1A2E]/45">
                      Novo?{" "}
                      <Link href="/signup" className="font-bold text-[#0B5E56] hover:underline">
                        Criar conta grátis
                      </Link>
                    </p>
                  </div>
                ) : (
                  <TaskProposalForm taskId={task.id} />
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function formatBudget(min: number | null, max: number | null) {
  const minFmt = formatMzn(min);
  const maxFmt = formatMzn(max);
  if (minFmt && maxFmt && min !== max) return `${minFmt} – ${maxFmt}`;
  if (minFmt) return `A partir de ${minFmt}`;
  if (maxFmt) return `Até ${maxFmt}`;
  return "A negociar";
}