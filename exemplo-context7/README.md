# Demo: Next.js + Better Auth + GitHub + SQLite

Demo mínima com Next.js App Router, login via GitHub, persistência local em SQLite e sessão lida no server.

## Requisitos

- Node.js 20+
- Uma GitHub OAuth App

## Variáveis de ambiente

Copie os valores de [.env.example](./.env.example) para `.env.local` se quiser trocar os placeholders já criados.

Preencha no GitHub OAuth App:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

## Rodando localmente

```bash
npm install
npx @better-auth/cli migrate --config auth.ts
npm run dev
```

Abra `http://localhost:3000`.

## O que o demo faz

- `/login`: mostra um único botão `Entrar com GitHub`
- `/`: mostra `Hello World` e o estado da sessão
- `better-auth.sqlite`: arquivo local do SQLite criado na raiz do projeto

## Observação importante

O projeto sobe com placeholders locais para o provider GitHub, mas o login real só funciona depois que você trocar `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` por valores válidos.

## Troubleshooting (404 no login)

Se ao clicar em `Entrar com GitHub` você cair em uma tela 404, revise:

- O OAuth App no GitHub deve ter exatamente:
	- Homepage URL: `http://localhost:3000`
	- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
- `BETTER_AUTH_URL` no `.env.local` deve ser `http://localhost:3000`
- `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` precisam ser do mesmo OAuth App
- Após alterar `.env.local`, reinicie o servidor (`npm run dev`)

Quando houver erro no callback, o demo agora mostra a página `/error` com o código do erro para facilitar o diagnóstico.
