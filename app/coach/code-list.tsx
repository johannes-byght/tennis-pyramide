"use client";

import { useState } from "react";

type CodeRow = {
  code: string;
  role: string;
  max_uses: number;
  used_count: number;
  pyramid: { name: string } | null;
};

export function CodeList({ codes }: { codes: CodeRow[] }) {
  const [showUsed, setShowUsed] = useState(false);

  const active = codes.filter((c) => c.used_count < c.max_uses);
  const used = codes.filter((c) => c.used_count >= c.max_uses);
  const visible = showUsed ? codes : active;

  return (
    <div className="space-y-1">
      <ul className="space-y-1 text-sm">
        {visible.map((c) => (
          <li
            key={c.code}
            className="flex items-center justify-between gap-2 rounded-pill bg-sand-50 dark:bg-court-800/30 px-3 py-2"
          >
            <span className="font-mono">{c.code}</span>
            <span className="text-xs text-muted">
              {c.pyramid?.name ?? c.role} · {c.used_count}/{c.max_uses}
            </span>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="text-xs text-muted px-1">Keine aktiven Codes.</li>
        )}
      </ul>
      {used.length > 0 && (
        <button
          type="button"
          onClick={() => setShowUsed((v) => !v)}
          className="text-xs text-muted underline underline-offset-2 mt-1"
        >
          {showUsed ? "Genutzte ausblenden" : `${used.length} genutzte${used.length === 1 ? "n" : ""} Code${used.length === 1 ? "" : "s"} anzeigen`}
        </button>
      )}
    </div>
  );
}
