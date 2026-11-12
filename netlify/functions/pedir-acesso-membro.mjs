// Pede um link de acesso (magic link) por email.
// Responde sempre com a mesma mensagem, encontre ou não o email na lista de
// aprovados, para não revelar quem tem conta (prática normal de segurança).
import { getStore } from "@netlify/blobs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const clientes = JSON.parse(readFileSync(path.join(aqui, "_dados", "clientes-aprovados.json"), "utf8"));

const MENSAGEM_OK = { ok: true, mensagem: "Se este email tiver acesso aprovado, vais receber um link de entrada dentro de minutos." };

function gerarToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

async function enviarEmail(destino, link) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    console.log("[pedir-acesso-membro] RESEND_API_KEY não configurada. Link gerado (modo teste):", link);
    return { enviado: false, motivo: "sem-chave" };
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "SALE.ON <area-cliente@saleon.pt>",
      to: [destino],
      subject: "O teu acesso à área de cliente SALE.ON",
      html: `<p>Olá,</p><p>Usa a ligação abaixo para entrares na tua área de cliente SALE.ON. É válida durante 15 minutos e só pode ser usada uma vez.</p><p><a href="${link}">Entrar na área de cliente</a></p><p>Se não pediste este acesso, ignora este email.</p>`,
    }),
  });
  if (!resp.ok) {
    const corpo = await resp.text();
    console.error("[pedir-acesso-membro] Falha a enviar email:", resp.status, corpo);
    return { enviado: false, motivo: "falha-envio" };
  }
  return { enviado: true };
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let email = "";
  try {
    const body = await req.json();
    email = String(body.email || "").trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ ok: false, erro: "Pedido inválido." }), { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false, erro: "Indica um email válido." }), { status: 400 });
  }

  const cliente = clientes.clientes.find((c) => c.email.toLowerCase() === email);
  if (cliente) {
    const token = gerarToken();
    const loja = getStore({ name: "membro-login-tokens", consistency: "strong" });
    await loja.setJSON(token, { email: cliente.email, salao: cliente.salao, criado: Date.now() }, { metadata: { expira: Date.now() + 15 * 60 * 1000 } });
    const origem = new URL(req.url).origin;
    const link = `${origem}/.netlify/functions/entrar-membro?t=${token}`;
    await enviarEmail(cliente.email, link);
  }

  return new Response(JSON.stringify(MENSAGEM_OK), { status: 200, headers: { "Content-Type": "application/json" } });
};
