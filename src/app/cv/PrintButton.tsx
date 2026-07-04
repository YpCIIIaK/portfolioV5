"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[13px] text-white hover:bg-blue-700"
    >
      <Printer size={14} /> Скачать PDF
    </button>
  );
}
