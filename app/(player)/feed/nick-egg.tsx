"use client";

import { useState } from "react";

export function NickEgg() {
  const [taps, setTaps] = useState(0);
  const [visible, setVisible] = useState(false);

  function handleTap() {
    const next = taps + 1;
    setTaps(next);
    if (next >= 3) {
      setTaps(0);
      setVisible(true);
      setTimeout(() => setVisible(false), 4000);
    }
  }

  return (
    <div className="flex flex-col items-center pb-8 pt-4 select-none">
      <button
        onClick={handleTap}
        aria-label="🎾"
        className="text-4xl transition-transform active:scale-75"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        🎾
      </button>

      {visible && (
        <div className="mt-3 animate-fade-in rounded-2xl bg-court-800 text-white px-5 py-3 text-sm text-center shadow-lg max-w-[220px]">
          <div className="text-lg mb-1">💡</div>
          <div className="font-medium">Diese App war Nicks Idee.</div>
          <div className="text-xs text-court-300 mt-1">Danke, Nick! 🙌</div>
        </div>
      )}
    </div>
  );
}
