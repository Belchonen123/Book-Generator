"use client";

import { createContext, useContext } from "react";

import type { BookStatusDb, BookTypeDb } from "@/types/database.types";

export type ProjectBookValue = {
  bookId: string;
  bookTitle: string;
  bookStatus: BookStatusDb;
  firstChapterId: string | null;
  bookType: BookTypeDb;
  /** Parent series id, or null if the book isn't part of a series. */
  seriesId: string | null;
};

const ProjectBookContext = createContext<ProjectBookValue | null>(null);

export function ProjectBookProvider({
  value,
  children,
}: {
  value: ProjectBookValue;
  children: React.ReactNode;
}) {
  return <ProjectBookContext.Provider value={value}>{children}</ProjectBookContext.Provider>;
}

export function useProjectBook(): ProjectBookValue {
  const ctx = useContext(ProjectBookContext);
  if (!ctx) {
    throw new Error("useProjectBook must be used within ProjectBookProvider");
  }
  return ctx;
}
