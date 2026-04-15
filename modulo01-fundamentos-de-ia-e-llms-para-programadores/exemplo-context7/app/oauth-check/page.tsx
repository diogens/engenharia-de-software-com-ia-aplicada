import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";

type CheckResult = {
  ok: boolean;
  label: string;
  detail: string;
};

export default async function OAuthCheckPage() {
  const results: CheckResult[] = [];

  // 1 — Session
  const requestHeaders = await headers();
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;

  try {
    session = await auth.api.getSession({ headers: requestHeaders });
    results.push({
      ok: !!session,
      label: "Sessão (cookie / JWT)",
      detail: session
        ? `Logado como ${session.user.email ?? session.user.name ?? session.user.id}`
        : "Nenhuma sessão ativa — faça login primeiro",
    });
  } catch (err) {
    results.push({
      ok: false,
      label: "Sessão (cookie / JWT)",
      detail: `Erro ao chamar getSession: ${String(err)}`,
    });
  }

  // 2 — Access token
  let accessToken: string | undefined;

  if (session) {
    try {
      const tokenResult = (await auth.api.getAccessToken({
        headers: requestHeaders,
        body: { providerId: "github" },
      })) as { accessToken?: string };

      accessToken = tokenResult.accessToken;
      results.push({
        ok: !!accessToken,
        label: "Access token do GitHub",
        detail: accessToken
          ? `Token obtido (${accessToken.slice(0, 6)}…)`
          : "getAccessToken retornou sem token — scope pode estar ausente ou token expirado",
      });
    } catch (err) {
      results.push({
        ok: false,
        label: "Access token do GitHub",
        detail: `Erro ao chamar getAccessToken: ${String(err)}`,
      });
    }
  } else {
    results.push({
      ok: false,
      label: "Access token do GitHub",
      detail: "Pulado — sem sessão ativa",
    });
  }

  // 3 — GitHub API
  if (accessToken) {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as { login: string; public_repos: number };
        results.push({
          ok: true,
          label: "GitHub API (/user)",
          detail: `OK — login: ${data.login}, repositórios públicos: ${data.public_repos}`,
        });
      } else {
        const body = await res.text();
        results.push({
          ok: false,
          label: "GitHub API (/user)",
          detail: `HTTP ${res.status} — ${body.slice(0, 200)}`,
        });
      }
    } catch (err) {
      results.push({
        ok: false,
        label: "GitHub API (/user)",
        detail: `Erro de rede: ${String(err)}`,
      });
    }
  } else {
    results.push({
      ok: false,
      label: "GitHub API (/user)",
      detail: "Pulado — sem access token",
    });
  }

  const allOk = results.every((r) => r.ok);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 shadow-[0_24px_80px_rgba(23,32,51,0.12)] backdrop-blur md:p-10">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-900">
          Diagnóstico OAuth
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Esta página testa cada etapa do fluxo de autenticação GitHub.
        </p>

        <ul className="mt-8 space-y-4">
          {results.map((r, i) => (
            <li
              key={i}
              className="flex gap-4 rounded-xl border border-[color:var(--line)] bg-white p-4"
            >
              <span className="mt-0.5 text-lg">{r.ok ? "✅" : "❌"}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                <p className="mt-0.5 text-sm text-slate-600">{r.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        {allOk && (
          <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            Tudo funcionando! Acesse{" "}
            <Link href="/repos" className="underline underline-offset-2">
              /repos
            </Link>{" "}
            para ver seu repositório.
          </p>
        )}

        <div className="mt-8 flex gap-3 flex-wrap">
          <Link
            href="/repos"
            className="rounded-xl bg-[color:var(--accent-strong)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Ver repositório
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-[color:var(--line)] px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Login
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-[color:var(--line)] px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Início
          </Link>
        </div>
      </section>
    </main>
  );
}
