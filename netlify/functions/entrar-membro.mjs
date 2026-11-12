// Troca o token de login (de 15 min, de uso único, vindo do email) por uma
// sessão de longa duração, e redireciona para a área de membro.
import { getStore } from "@netlify/blobs";

function gerarToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export default async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") || "";
  const destino = `${url.origin}/membros/`;

  if (!token) return Response.redirect(`${destino}?erro=1`, 302);

  const login = getStore({ name: "membro-login-tokens", consistency: "strong" });
  const { value, metadata } = await login.getWithMetadata(token, { type: "json" }).catch(() => ({ value: null, metadata: null }));

  if (!value || !metadata || Date.now() > metadata.expira) {
    if (value) await login.delete(token).catch(() => {});
    return Response.redirect(`${destino}?erro=expirado`, 302);
  }
  await login.delete(token).catch(() => {}); // uso único

  const sessaoToken = gerarToken();
  const sessoes = getStore({ name: "membro-sessoes", consistency: "strong" });
  await sessoes.setJSON(sessaoToken, { email: value.email, salao: value.salao, criado: Date.now() });

  return Response.redirect(`${destino}#sessao=${sessaoToken}`, 302);
};
