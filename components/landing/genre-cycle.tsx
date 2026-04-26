"use client";

import { useEffect, useState } from "react";

const GENRES = [
  "Novel",
  "Memoir",
  "Guide",
  "Thriller",
  "Cookbook",
] as const;

export function GenreCycle() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tick = () => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % GENRES.length);
        setVisible(true);
      }, 280);
    };
    const id = window.setInterval(tick, 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      className="relative inline-flex min-w-[9.5ch] justify-center font-serif text-gold tabular-nums"
      aria-live="polite"
    >
      <span
        className={`transition-all duration-300 ease-out ${
          visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
      >
        {GENRES[index]}
      </span>
    </span>
  );
}
