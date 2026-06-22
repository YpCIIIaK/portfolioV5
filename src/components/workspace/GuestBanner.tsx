"use client";

import { Lock } from "lucide-react";
import { useSession } from "@/lib/session";

/** Shown above demo data when the visitor isn't the owner. */
export function GuestBanner({ what }: { what: string }) {
  const configured = useSession((s) => s.configured);
  return (
    <div className="mb-4 flex items-start gap-2 rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[12.5px] text-vsc-muted">
      <Lock size={14} className="mt-0.5 shrink-0" />
      <span>
        Демо-режим: {what} только для просмотра.{" "}
        {configured ? (
          <a href="/api/auth/login" className="text-vsc-accent hover:underline">
            Войти через GitHub
          </a>
        ) : (
          <span>Вход через GitHub появится, когда владелец настроит OAuth.</span>
        )}{" "}
        — и здесь будут твои данные.
      </span>
    </div>
  );
}
