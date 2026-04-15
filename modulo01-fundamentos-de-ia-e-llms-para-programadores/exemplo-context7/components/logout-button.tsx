"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    try {
      setIsPending(true);
      await authClient.signOut();
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-medium text-slate-900 hover:-translate-y-0.5 hover:border-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isPending ? "Saindo..." : "Sair"}
    </button>
  );
}