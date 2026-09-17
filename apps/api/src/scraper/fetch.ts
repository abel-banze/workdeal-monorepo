import { sleep } from "./sanitize.js";

const BASE_URL = "https://www.ufsa.gov.mz";
const USER_AGENT = "WorkdeealBot/1.0 (UFSA Sync; +https://workdeals.site)";

let sessionCookie: string | null = null;

function readFirstCookie(headers: Headers): string | null {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = typeof withGetSetCookie.getSetCookie === "function" ? withGetSetCookie.getSetCookie() : [];
  const setCookie = setCookies[0] ?? headers.get("set-cookie");
  if (!setCookie) return null;
  return setCookie.split(";")[0] ?? null;
}

async function ensureSession(): Promise<void> {
  if (sessionCookie) return;

  const response = await fetch(`${BASE_URL}/concursos.php`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-MZ,pt;q=0.9",
    },
  });

  const cookie = readFirstCookie(response.headers);
  if (cookie) sessionCookie = cookie;
}

async function fetchHtml(url: string, retries = 3): Promise<string> {
  await ensureSession();

  for (let attempt = 1; attempt <= retries; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "pt-MZ,pt;q=0.9",
          Referer: `${BASE_URL}/concursos.php`,
          ...(sessionCookie ? { Cookie: sessionCookie } : {}),
        },
      });
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(attempt * 1000);
      continue;
    }

    if (response.ok) return await response.text();

    const retryable = response.status === 502 || response.status === 503;
    if (retryable && attempt < retries) {
      await sleep(attempt * 1000);
      continue;
    }

    throw new Error(`HTTP ${response.status} ao consultar ${url}`);
  }

  throw new Error(`Falhou após ${retries} tentativas: ${url}`);
}

export async function fetchList(type: "open" | "closed" = "open"): Promise<string> {
  const endpoint = type === "open" ? "Busca_concurso1.php" : "concursos_enc.php";
  return fetchHtml(`${BASE_URL}/query/${endpoint}?dado=&dt=`);
}

export function fetchDetails(reference: string): Promise<string> {
  const encoded = encodeURIComponent(reference);
  return fetchHtml(`${BASE_URL}/concurso_detalhes.php?referencia=${encoded}`);
}

export { BASE_URL, USER_AGENT };