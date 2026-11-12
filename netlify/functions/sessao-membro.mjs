// Valida uma sessão da área de membro e devolve os dados do salão.
// Chamado pela página /membros/ sempre que carrega, para confirmar que o
// acesso ainda é válido (permite à SALE.ON revogar um cliente a qualquer momento).
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("s") || "";
  if (!token) return new Response(JSON.stringify({ ok: false }), { status: 400 });

  const sessoes = getStore({ name: "membro-sessoes", consistency: "strong" });
  const dados = await sessoes.get(token, { type: "json" }).catch(() => null);

  if (!dados) return new Response(JSON.stringify({ ok: false }), { status: 401 });
  return new Response(JSON.stringify({ ok: true, email: dados.email, salao: dados.salao }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
