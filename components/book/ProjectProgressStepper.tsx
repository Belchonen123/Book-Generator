"use client";

import { usePathname } from "next/navigation";

import { displayStatusForProjectPath } from "@/lib/book/workflow";
import { useProjectBook } from "@/components/layout/project-book-context";
import type { BookStatusDb } from "@/types/database.types";

import { ProgressStepper } from "./ProgressStepper";

type ProjectProgressStepperProps = {
  bookStatus: BookStatusDb;
};

export function ProjectProgressStepper({ bookStatus }: ProjectProgressStepperProps) {
  const pathname = usePathname() ?? "";
  const { bookId, firstChapterId } = useProjectBook();
  const effective = displayStatusForProjectPath(pathname, bookStatus);
  return (
    <ProgressStepper
      currentStatus={effective}
      bookId={bookId}
      firstChapterId={firstChapterId}
    />
  );
}
