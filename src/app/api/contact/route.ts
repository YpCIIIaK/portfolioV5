import { NextResponse } from "next/server";
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "Укажите имя").max(100),
  email: z.string().email("Некорректный email"),
  message: z.string().min(5, "Сообщение слишком короткое").max(4000),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Ошибка валидации";
    return NextResponse.json({ error: first }, { status: 422 });
  }

  const { name, email, message } = parsed.data;

  // Если задан CONTACT_WEBHOOK (Telegram / Discord / любой), пересылаем туда.
  // Без env-переменной просто логируем — форма всё равно проходит валидацию.
  const webhook = process.env.CONTACT_WEBHOOK;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `📨 Новое сообщение с портфолио\nОт: ${name} <${email}>\n\n${message}`,
        }),
      });
    } catch (err) {
      console.error("contact webhook failed", err);
    }
  } else {
    console.log("[contact]", { name, email, message });
  }

  return NextResponse.json({ ok: true });
}
