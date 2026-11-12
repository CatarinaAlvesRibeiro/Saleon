// Termina uma sessão da área de membro (botão "Sair").
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let token = "";
  try {
    token = String((await req.json()).sessao || "");
  } catch {}
  if (token) {
    const sessoes = getStore({ name: "membro-sessoes", consistency: "strong" });
    await sessoes.delete(token).catch(() => {});
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};
