"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import type { ExportPanelProps } from "@/components/book/export/export-types";
import type { OutlineEditorProps } from "@/components/book/OutlineEditor";
import type { CoverGeneratorProps } from "@/components/book/CoverGenerator";

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div
      className="mx-auto max-w-4xl animate-pulse rounded-xl border border-border/60 bg-card/30 px-6 py-16"
      aria-busy="true"
      aria-label={label}
    >
      <div className="mx-auto h-8 max-w-md rounded bg-muted/50" />
      <div className="mx-auto mt-6 h-4 max-w-lg rounded bg-muted/40" />
      <div className="mx-auto mt-4 h-4 max-w-sm rounded bg-muted/30" />
      <div className="mt-10 space-y-3">
        <div className="h-24 rounded-lg bg-muted/35" />
        <div className="h-24 rounded-lg bg-muted/25" />
      </div>
    </div>
  );
}

const OutlineEditorDynamic = dynamic(
  () => import("@/components/book/OutlineEditor").then((m) => m.OutlineEditor),
  { ssr: false, loading: () => <PanelSkeleton label="Loading outline editor" /> },
);

const CoverGeneratorDynamic = dynamic(
  () => import("@/components/book/CoverGenerator").then((m) => m.CoverGenerator),
  { ssr: false, loading: () => <PanelSkeleton label="Loading cover tools" /> },
);

const ExportPanelDynamic = dynamic(
  () => import("@/components/book/ExportPanel").then((m) => m.ExportPanel),
  { ssr: false, loading: () => <PanelSkeleton label="Loading export tools" /> },
);

export function OutlineEditorLazy(props: OutlineEditorProps) {
  return (
    <Suspense fallback={<PanelSkeleton label="Loading outline editor" />}>
      <OutlineEditorDynamic {...props} />
    </Suspense>
  );
}

export function CoverGeneratorLazy(props: CoverGeneratorProps) {
  return (
    <Suspense fallback={<PanelSkeleton label="Loading cover tools" />}>
      <CoverGeneratorDynamic {...props} />
    </Suspense>
  );
}

export function ExportPanelLazy(props: ExportPanelProps) {
  return (
    <Suspense fallback={<PanelSkeleton label="Loading export tools" />}>
      <ExportPanelDynamic {...props} />
    </Suspense>
  );
}
