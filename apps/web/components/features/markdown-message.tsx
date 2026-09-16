"use client";

import * as React from "react";
import { useMemo, type ReactNode } from "react";
import { marked } from "marked";
import type { Token } from "marked";

function safeHref(href: string): string | null {
  try {
    const url = new URL(href, "https://workdeal.co.mz");
    if (["http:", "https:", "mailto:"].includes(url.protocol)) return href;
    return null;
  } catch {
    return null;
  }
}

function renderInline(tokens: Token[] | undefined, keyPrefix: string): ReactNode[] {
  if (!tokens) return [];
  return tokens.map((t, i) => renderToken(t, `${keyPrefix}-${i}`));
}

function renderToken(t: Token, key: string): ReactNode {
  switch (t.type) {
    case "text":
    case "escape":
      return <span key={key}>{(t as { text?: string }).text ?? ""}</span>;
    case "strong":
      return <strong key={key}>{renderInline((t as { tokens?: Token[] }).tokens, key)}</strong>;
    case "em":
      return <em key={key}>{renderInline((t as { tokens?: Token[] }).tokens, key)}</em>;
    case "del":
      return <del key={key}>{renderInline((t as { tokens?: Token[] }).tokens, key)}</del>;
    case "codespan":
      return (
        <code key={key} className="rounded bg-black/10 px-1 py-px font-mono text-[0.9em]">
          {(t as { text?: string }).text ?? ""}
        </code>
      );
    case "br":
      return <br key={key} />;
    case "link": {
      const href = safeHref((t as { href?: string }).href ?? "");
      const children = renderInline((t as { tokens?: Token[] }).tokens, key);
      if (!href) return <span key={key}>{children}</span>;
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
          {children}
        </a>
      );
    }
    case "image": {
      const href = safeHref((t as { href?: string }).href ?? "");
      const alt = (t as { text?: string }).text ?? "imagem";
      if (!href) return <span key={key}>{alt}</span>;
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
          {alt}
        </a>
      );
    }
    case "paragraph":
      return <p key={key}>{renderInline((t as { tokens?: Token[] }).tokens, key)}</p>;
    case "heading": {
      const depth = (t as { depth?: number }).depth ?? 4;
      const cls = "mt-1 font-black tracking-tight";
      const children = renderInline((t as { tokens?: Token[] }).tokens, key);
      if (depth <= 2) return <p key={key} className={`text-[15px] ${cls}`}>{children}</p>;
      return <p key={key} className={`text-[14px] ${cls}`}>{children}</p>;
    }
    case "list": {
      const ordered = (t as { ordered?: boolean }).ordered;
      const items = ((t as { items?: Token[] }).items ?? []).map((item, i) => (
        <li key={`${key}-${i}`} className="leading-relaxed">
          {renderInline((item as { tokens?: Token[] }).tokens, `${key}-${i}`)}
        </li>
      ));
      return ordered ? (
        <ol key={key} className="list-decimal space-y-1 pl-5">{items}</ol>
      ) : (
        <ul key={key} className="list-disc space-y-1 pl-5">{items}</ul>
      );
    }
    case "blockquote":
      return (
        <blockquote key={key} className="border-l-2 border-current pl-3 opacity-80">
          {renderInline((t as { tokens?: Token[] }).tokens, key)}
        </blockquote>
      );
    case "code":
      return (
        <pre key={key} className="overflow-x-auto rounded-lg bg-black/10 p-2 font-mono text-[12px] leading-relaxed">
          {(t as { text?: string }).text ?? ""}
        </pre>
      );
    case "table": {
      const tt = t as { header?: Token[]; rows?: Token[][] };
      return (
        <table key={key} className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {(tt.header ?? []).map((h, i) => (
                <th key={`${key}-h${i}`} className="border-b border-current/20 px-2 py-1 text-left font-bold">
                  {renderInline((h as { tokens?: Token[] }).tokens ?? [h], `${key}-h${i}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(tt.rows ?? []).map((row, r) => (
              <tr key={`${key}-r${r}`}>
                {row.map((cell, c) => (
                  <td key={`${key}-r${r}c${c}`} className="border-b border-current/10 px-2 py-1 align-top">
                    {renderInline((cell as { tokens?: Token[] }).tokens ?? [cell], `${key}-r${r}c${c}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "hr":
      return <hr key={key} className="border-current/20" />;
    case "space":
      return null;
    case "html":
      // HTML cru nunca é renderizado (segurança) — ignora.
      return null;
    default:
      return <span key={key}>{(t as { text?: string }).text ?? (t as { raw?: string }).raw ?? ""}</span>;
  }
}

/**
 * Renderiza markdown do assistente com o pkg `marked` (lexer → React).
 * Seguro por construção: tokens `html` são descartados e links restritos
 * a http/https/mailto — nunca há `dangerouslySetInnerHTML`.
 */
export function MarkdownMessage({ content, className }: { content: string; className?: string }) {
  const nodes = useMemo(() => {
    try {
      const tokens = marked.lexer(content ?? "");
      return tokens.map((t, i) => renderToken(t, `md-${i}`));
    } catch {
      return [content];
    }
  }, [content]);

  return <div className={`space-y-2 text-[13px] leading-relaxed ${className ?? ""}`}>{nodes}</div>;
}
