import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  stargazers_count: number;
  language: string | null;
};

type AccessTokenResponse = {
  accessToken?: string;
};

async function getGithubAccessToken() {
  const requestHeaders = await headers();

  const tokenResult = (await auth.api.getAccessToken({
    headers: requestHeaders,
    body: {
      providerId: "github",
    },
  })) as AccessTokenResponse;

  return tokenResult.accessToken;
}

async function getFirstRepository(accessToken: string) {
  const response = await fetch("https://api.github.com/user/repos?per_page=1&sort=updated", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      repo: null,
      status: response.status,
    };
  }

  const repos = (await response.json()) as GithubRepo[];

  return {
    repo: repos[0] ?? null,
    status: 200,
  };
}

export default async function ReposPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const accessToken = await getGithubAccessToken();

  if (!accessToken) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <section className="w-full max-w-2xl rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 shadow-[0_24px_80px_rgba(23,32,51,0.12)] backdrop-blur md:p-10">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-900">Repositorio do GitHub</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Sessao encontrada, mas nao foi possivel recuperar o token do GitHub.
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Tente sair e entrar novamente para reautorizar o provider.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Voltar para home
          </Link>
        </section>
      </main>
    );
  }

  const { repo, status } = await getFirstRepository(accessToken);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 shadow-[0_24px_80px_rgba(23,32,51,0.12)] backdrop-blur md:p-10">
        <p className="font-mono text-sm uppercase tracking-[0.35em] text-[color:var(--accent-strong)]">
          GitHub Data
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-900">
          1 repositorio do usuario logado
        </h1>

        {repo ? (
          <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-white/70 p-5">
            <p className="text-lg font-medium text-slate-900">{repo.full_name}</p>
            <p className="mt-2 text-sm text-slate-600">
              {repo.description ?? "Sem descricao"}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                {repo.private ? "Privado" : "Publico"}
              </span>
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                Stars: {repo.stargazers_count}
              </span>
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                Linguagem: {repo.language ?? "N/A"}
              </span>
            </div>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Abrir repositorio no GitHub
            </a>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-white/70 p-5 text-sm text-slate-700">
            Nenhum repositorio encontrado para este usuario ou a API retornou status {status}.
          </div>
        )}

        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-medium text-slate-800 hover:-translate-y-0.5"
        >
          Voltar para home
        </Link>
      </section>
    </main>
  );
}
