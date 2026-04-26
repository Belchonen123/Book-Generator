"use client";

import { usePathname } from "next/navigation";

import { Header } from "@/components/layout/Header";

function titleForPath(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return "Your library";
  }
  if (pathname.startsWith("/profile")) {
    return "Profile";
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return "Settings";
  }
  return "Dashboard";
}

export function DashboardChrome({
  activeSeriesCount,
  children,
}: {
  activeSeriesCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isProject = /^\/projects\/[^/]+/.test(pathname);

  if (isProject) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col bg-editorial-bg">
      <Header title={titleForPath(pathname)} activeSeriesCount={activeSeriesCount} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
