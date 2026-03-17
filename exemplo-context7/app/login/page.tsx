import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GithubLoginButton } from "@/components/github-login-button";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 shadow-[0_24px_80px_rgba(23,32,51,0.12)] backdrop-blur md:p-10">
        <p className="font-mono text-sm uppercase tracking-[0.35em] text-[color:var(--accent-strong)]">
          Login / Signup
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-900">
          Entrar com GitHub
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Um único botão inicia o OAuth oficial do Better Auth e retorna para a home após o login.
        </p>

        <div className="mt-8">
          <GithubLoginButton callbackURL="/repos" />
        </div>

        <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-white/70 p-4 text-sm text-slate-600">
          Callback GitHub: http://localhost:3000/api/auth/callback/github
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex text-sm font-medium text-slate-700 underline decoration-[color:var(--accent)] underline-offset-4 hover:text-slate-950"
        >
          Voltar para a home
        </Link>
      </section>
    </main>
  );
}