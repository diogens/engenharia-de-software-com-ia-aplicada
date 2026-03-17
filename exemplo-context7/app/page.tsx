import Link from "next/link";
import { headers } from "next/headers";

import { LogoutButton } from "@/components/logout-button";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userLabel = session?.user.email ?? session?.user.name ?? "usuário sem nome";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_24px_80px_rgba(23,32,51,0.12)] backdrop-blur">
        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-[color:var(--line)] p-8 md:border-r md:border-b-0 md:p-12">
            <p className="font-mono text-sm uppercase tracking-[0.35em] text-[color:var(--accent-strong)]">
              Next.js + Better Auth
            </p>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-slate-900">
              Hello World
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
              Demo mínima com App Router, GitHub OAuth e SQLite local para usuários e sessões.
            </p>

            <div className="mt-10 rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-6">
              <p className="font-mono text-sm uppercase tracking-[0.25em] text-slate-500">
                Estado da sessão
              </p>
              {session ? (
                <>
                  <p className="mt-4 text-2xl font-medium text-slate-900">
                    Logado como {userLabel}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Nome: {session.user.name ?? "não informado"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Email: {session.user.email}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-2xl font-medium text-slate-900">
                    Você não está logado
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Use a página de login para iniciar o OAuth com GitHub.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between p-8 md:p-12">
            <div>
              <div className="inline-flex rounded-full border border-[color:var(--line)] bg-white/70 px-4 py-2 font-mono text-xs uppercase tracking-[0.3em] text-slate-500">
                App Router
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                Fluxo simples para testar localmente.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                O banco local é criado no arquivo better-auth.sqlite e a sessão é lida no server component.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {session ? (
                <>
                  <Link
                    href="/repos"
                    className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Ver 1 repositorio do GitHub
                  </Link>
                  <LogoutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Ir para login
                </Link>
              )}
              <p className="text-xs text-slate-500">
                Callback esperado no GitHub OAuth: http://localhost:3000/api/auth/callback/github
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
