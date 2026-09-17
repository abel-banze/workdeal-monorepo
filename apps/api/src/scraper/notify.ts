const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text: string): Promise<void> {
  if (!token || !chatId) return;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    throw new Error(`Telegram respondeu HTTP ${response.status}`);
  }
}

export function notifyNewTenders(count: number): Promise<void> {
  return sendTelegram(
    `✅ *${count} novo(s) concurso(s) público(s) encontrado(s) no UFSA.*\n\nVeja em: https://workdeeal.co.mz/concursos`,
  );
}

export function notifyError(message: string): Promise<void> {
  return sendTelegram(`⚠️ Erro no scraper de concursos: ${message}`);
}