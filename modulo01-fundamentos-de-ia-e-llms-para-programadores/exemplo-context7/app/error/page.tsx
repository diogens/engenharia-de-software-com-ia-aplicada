import Link from "next/link";

type ErrorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = (await searchParams) ?? {};
  const error = getFirstValue(params.error) ?? "oauth_error";
  const description = getFirstValue(params.error_description);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 shadow-[0_24px_80px_rgba(23,32,51,0.12)] backdrop-blur md:p-10">
        <p className="font-mono text-sm uppercase tracking-[0.35em] text-[color:var(--accent-strong)]">
          OAuth Error
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-900">
          Falha no login com GitHub
        </h1>

        <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-white/70 p-5 text-sm text-slate-700">
          <p>
            <span className="font-medium text-slate-900">Erro:</span> {error}
          </p>
          {description ? (
            <p className="mt-2">
              <span className="font-medium text-slate-900">Detalhe:</span> {description}
            </p>
          ) : null}
        </div>

        <p className="mt-5 text-sm leading-7 text-slate-600">
          Confira se o OAuth App no GitHub usa exatamente a callback
          <br />
          <code>http://localhost:3000/api/auth/callback/github</code>
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Tentar login novamente
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-medium text-slate-800 hover:-translate-y-0.5"
          >
            Voltar para home
          </Link>
        </div>
      </section>
    </main>
  );
}