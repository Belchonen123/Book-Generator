import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { IdeaPageContent } from "./_components/idea-page-content";

export default function IdeaPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <IdeaPageContent bookId={params.id} />
    </Suspense>
  );
}
