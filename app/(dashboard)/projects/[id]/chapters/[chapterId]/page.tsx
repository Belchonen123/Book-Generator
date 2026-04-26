import { Suspense } from "react";

import { ProjectWorkspaceSkeleton } from "@/components/layout/skeletons";

import { ChapterPageContent } from "./_components/chapter-page-content";

export default function ChapterPage({
  params,
}: {
  params: { id: string; chapterId: string };
}) {
  return (
    <Suspense fallback={<ProjectWorkspaceSkeleton />}>
      <ChapterPageContent bookId={params.id} chapterId={params.chapterId} />
    </Suspense>
  );
}
