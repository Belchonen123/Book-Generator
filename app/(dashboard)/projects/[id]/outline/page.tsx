import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { OutlinePageContent } from "./_components/outline-page-content";

export default function OutlinePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <OutlinePageContent bookId={params.id} />
    </Suspense>
  );
}
