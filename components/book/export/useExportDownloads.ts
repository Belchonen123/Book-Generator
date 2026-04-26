import { useState } from "react";
import { toast } from "sonner";

import {
  coverPathFromPublicUrl,
  parseFilenameFromDisposition,
  slugFileBase,
} from "@/components/book/export/export-download-utils";
import { recordBookDownloadAction } from "@/app/(dashboard)/dashboard/actions";
import { createClient } from "@/lib/supabase/client";
import { useGlobalProgressStore } from "@/stores/global-progress-store";
import type { TrimSizeId } from "@/lib/utils/schemas";

export function useExportDownloads(bookId: string, title: string, coverUrl: string | null) {
  const [compileBusy, setCompileBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [kdpPackBusy, setKdpPackBusy] = useState(false);

  async function compileAndDownload(trimSize?: TrimSizeId) {
    setCompileBusy(true);
    useGlobalProgressStore.getState().start();
    try {
      const res = await fetch("/api/compile-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ bookId, ...(trimSize ? { trimSize } : {}) }),
      });

      if (!res.ok) {
        let msg = "Could not compile your book.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      const blob = await res.blob();
      const fromHeader = parseFilenameFromDisposition(res.headers.get("Content-Disposition"));
      const name = fromHeader ?? `${slugFileBase(title)}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your book download has started.");
      void recordBookDownloadAction(bookId);
    } catch {
      toast.error("Network error while compiling.");
    } finally {
      useGlobalProgressStore.getState().stop();
      setCompileBusy(false);
    }
  }

  async function downloadKdpPack() {
    setKdpPackBusy(true);
    useGlobalProgressStore.getState().start();
    try {
      const res = await fetch("/api/export-kdp-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ bookId }),
      });

      if (!res.ok) {
        let msg = "Could not build your KDP listing pack.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      const blob = await res.blob();
      const fromHeader = parseFilenameFromDisposition(res.headers.get("Content-Disposition"));
      const name = fromHeader ?? `${slugFileBase(title)}-KDP-Pack.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("KDP listing pack download started.");
    } catch {
      toast.error("Network error while building the KDP pack.");
    } finally {
      useGlobalProgressStore.getState().stop();
      setKdpPackBusy(false);
    }
  }

  async function downloadCoverImage() {
    if (!coverUrl) {
      toast.error("No cover image saved for this project.");
      return;
    }
    setCoverBusy(true);
    useGlobalProgressStore.getState().start();
    try {
      const path = coverPathFromPublicUrl(coverUrl);
      const supabase = createClient();
      let blob: Blob;
      if (path) {
        const { data, error } = await supabase.storage.from("covers").download(path);
        if (error || !data) {
          const r = await fetch(coverUrl);
          if (!r.ok) throw new Error("fetch");
          blob = await r.blob();
        } else {
          blob = data;
        }
      } else {
        const r = await fetch(coverUrl);
        if (!r.ok) throw new Error("fetch");
        blob = await r.blob();
      }

      const ext = blob.type.includes("png") ? "png" : blob.type.includes("jpeg") ? "jpg" : "png";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugFileBase(title)}-cover.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Cover download started.");
    } catch {
      toast.error("Could not download the cover. Try again.");
    } finally {
      useGlobalProgressStore.getState().stop();
      setCoverBusy(false);
    }
  }

  return {
    compileBusy,
    coverBusy,
    kdpPackBusy,
    compileAndDownload,
    downloadCoverImage,
    downloadKdpPack,
  };
}
