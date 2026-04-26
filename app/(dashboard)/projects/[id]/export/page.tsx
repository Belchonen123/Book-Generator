import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { ExportPageContent } from "./_components/export-page-content";

export default function ExportPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <ExportPageContent bookId={params.id} />
    </Suspense>
  );
}
