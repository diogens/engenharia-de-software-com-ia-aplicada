"use client";

import { useState } from "react";

import { GithubIcon } from "@/components/github-icon";
import { authClient } from "@/lib/auth-client";

type GithubLoginButtonProps = {
  callbackURL: string;
};

export function GithubLoginButton({ callbackURL }: GithubLoginButtonProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleSignIn() {
    try {
      setIsPending(true);
      await authClient.signIn.social({
        provider: "github",
        callbackURL,
        errorCallbackURL: "/error",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={isPending}
      className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <GithubIcon className="h-5 w-5" />
      {isPending ? "Redirecionando..." : "Entrar com GitHub"}
    </button>
  );
}