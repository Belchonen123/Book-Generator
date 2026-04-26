import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { ProjectEntryContent } from "./_components/project-entry-content";

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <ProjectEntryContent bookId={params.id} />
    </Suspense>
  );
}
