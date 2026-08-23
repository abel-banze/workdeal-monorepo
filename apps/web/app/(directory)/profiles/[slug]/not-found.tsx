"use client";

import Link from "next/link";
import { FiSearch, FiArrowLeft, FiHome, FiUserX } from "react-icons/fi";
import { BsPatchCheckFill } from "react-icons/bs";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@workspace/ui/components/input-group";

export default function NotFound() {
  return (
    <div className="bg-[#F6F3EE]">
      <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-[28px] border border-[#D9D2C2] bg-white">
          <div className="h-[4px] w-full bg-[#D9D2C2]/60" />
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            {/* ESQUERDA — ícone grande como destaque, textos embaixo */}
            <div className="flex flex-col border-b border-[#D9D2C2] bg-[#F6F3EE] px-6 py-8 sm:px-7 lg:border-b-0 lg:border-r">
              {/* destaque */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="flex size-[112px] items-center justify-center rounded-[28px] border border-[#D9D2C2] bg-white shadow-[0_12px_32px_rgba(15,26,46,0.10)] sm:size-[124px]">
                    <FiUserX className="size-[52px] text-[#0F1A2E]/25 sm:size-[56px]" aria-hidden />
                  </div>
                  <span
                    aria-hidden
                    className="absolute -right-2 -top-2 rounded-full border-2 border-white bg-[#FF3B1F] px-2.5 py-1 font-mono text-[11px] font-black leading-none tracking-[0.14em] text-white shadow"
                  >
                    404
                  </span>
                </div>
                <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F1A2E]/30">Perfil não encontrado</p>
                <div
                  aria-hidden
                  className="mt-3 h-px w-12 bg-[#D9D2C2]"
                />
              </div>

              {/* textos/info embaixo do ícone */}
              <div className="mt-8">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Arquivo Workdeal · Empresas</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#0F1A2E]/60">
                  Cada empresa tem um dossiê com selos, contactos e morada. Quando o endereço muda ou o perfil é removido, o dossiê sai
                  da prateleira — mas o directório continua.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C2] bg-white px-3 py-1.5 text-xs font-medium text-[#0F1A2E]/70">
                    <span className="size-1.5 rounded-full bg-[#0B5E56]" /> NUIT & alvará verificados nos perfis activos
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 divide-x divide-[#D9D2C2] overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white text-center">
                  <div className="px-3 py-3">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">Directório</p>
                    <p className="text-sm font-black text-[#0F1A2E]">Empresas</p>
                  </div>
                  <div className="px-3 py-3">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">Pesquisa</p>
                    <p className="text-sm font-black text-[#0F1A2E]">PostGIS</p>
                  </div>
                  <div className="px-3 py-3">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">Contacto</p>
                    <p className="text-sm font-black text-[#0F1A2E]">Directo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* DIREITA — cópia + acções */}
            <div className="flex flex-col px-6 py-7 sm:px-8 sm:py-8">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/40">404 · Perfil não encontrado</p>
              <h1
                className="mt-2 text-[28px] font-black leading-[0.92] tracking-[-0.05em] text-[#0F1A2E] sm:text-[34px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Este perfil não existe
                <br />
                <span className="font-normal text-[#0F1A2E]/60">ou foi removido.</span>
              </h1>
              <p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-[#0F1A2E]/70">
                O endereço pode estar desactualizado, ter sido renomeado ou a empresa ainda não publicou o perfil. Tente pesquisar pelo
                nome — a procura no Workdeal é por nome, categoria e proximidade.
              </p>

              {/* pesquisa — InputGroup (corrige input quebrado) */}
              <form action="/companies" method="get" className="mt-6" aria-label="Pesquisar empresas">
                <label className="sr-only" htmlFor="notfound-q">
                  Pesquisar empresa
                </label>
                <InputGroup className="h-11 rounded-full border-[#D9D2C2] bg-[#F6F3EE] has-[[data-slot=input-group-control]:focus-visible]:border-[#0B5E56] has-[[data-slot=input-group-control]:focus-visible]:bg-white has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-[#0B5E56]/15">
                  <InputGroupAddon align="inline-start" className="pl-3">
                    <FiSearch className="size-4 text-[#0F1A2E]/35" aria-hidden />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="notfound-q"
                    name="q"
                    placeholder="Ex.: construtora Maputo, electricista…"
                    autoComplete="off"
                    className="h-full px-2 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/35"
                  />
                  <InputGroupAddon align="inline-end" className="pr-1.5">
                    <InputGroupButton
                      type="submit"
                      variant="default"
                      size="xs"
                      className="h-8 rounded-full bg-[#0F1A2E] px-4 text-xs font-bold text-white hover:bg-black"
                    >
                      Pesquisar
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </form>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Link
                  href="/companies?q=construção"
                  className="rounded-full border border-[#D9D2C2] bg-white px-3 py-1 text-xs font-medium text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"
                >
                  Construção
                </Link>
                <Link
                  href="/companies?q=electricidade"
                  className="rounded-full border border-[#D9D2C2] bg-white px-3 py-1 text-xs font-medium text-[#0F1A2E]/70 hover:bg-[#F6F3EE]"
                >
                  Electricidade
                </Link>
                <Link href="/companies?sort=distance" className="rounded-full bg-[#0B5E56] px-3 py-1 text-xs font-bold text-white hover:bg-[#0A4A44]">
                  Mais próximas
                </Link>
              </div>

              <div className="mt-6 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">O que pode fazer</p>
                <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[#0F1A2E]/75">
                  <li className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0B5E56]" aria-hidden />
                    <span>Verifique se o link foi copiado correctamente — um hífen a menos muda o slug.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0B5E56]" aria-hidden />
                    <span>Pesquise pelo nome da empresa no directório; a listagem é paginada e indexada por PostGIS.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0B5E56]" aria-hidden />
                    <span>Se veio de um convite ou proposta, peça ao remetente o link actualizado.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/companies"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0F1A2E] px-6 text-sm font-bold text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1A2E]/30"
                >
                  <FiSearch className="size-4" aria-hidden /> Ver empresas
                </Link>
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#D9D2C2] bg-white px-5 text-sm font-semibold text-[#0F1A2E] hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
                >
                  <FiHome className="size-4" aria-hidden /> Início
                </Link>
                <button
                  type="button"
                  onClick={() => history.back()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#D9D2C2] bg-white px-5 text-sm font-semibold text-[#0F1A2E]/70 hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
                  aria-label="Voltar à página anterior"
                >
                  <FiArrowLeft className="size-4" aria-hidden /> Voltar
                </button>
              </div>

              <p className="mt-4 inline-flex items-center gap-1.5 text-xs leading-relaxed text-[#0F1A2E]/50">
                <BsPatchCheckFill className="size-3.5 shrink-0 text-[#0B5E56]" aria-hidden />
                Perfis com selo verde têm NUIT e alvará confirmados pela equipa Workdeal.
              </p>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-[720px] text-center font-mono text-[11px] leading-relaxed text-[#0F1A2E]/35">
          Código 404 · Se acha que isto é um erro, copie o URL e envie para suporte — verificamos o slug nos registos.
        </p>
      </div>
    </div>
  );
}
