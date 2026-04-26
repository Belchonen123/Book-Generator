import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { CoverPageContent } from "./_components/cover-page-content";

export default function CoverPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <CoverPageContent bookId={params.id} />
    </Suspense>
  );
}
