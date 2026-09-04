"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "@/components/admin/shared/CommandPalette";
import { useAdminSidebar, useCommandPalette } from "@/hooks/admin/useAdminShell";
import { ADMIN_NAV } from "@/services/admin/navigation";
import { ADMIN_CSS } from "@/components/admin/admin-tokens";
import { useAdminLiveAlerts } from "@/hooks/admin/useAdminLiveMetrics";

type Props = {
  children: React.ReactNode;
};

function breadcrumbFor(pathname: string): string[] {
  const p = pathname.replace(/\/$/, "") || "/";
  if (p === "/control-center") return ["Dashboard"];
  const item = ADMIN_NAV.find(
    (n) => n.href !== "/control-center" && (p === n.href || p.startsWith(`${n.href}/`)),
  );
  return item ? [item.label] : ["Dashboard"];
}

export function AdminShell({ children }: Props) {
  const pathname = usePathname();
  const sidebar = useAdminSidebar();
  const palette = useCommandPalette();
  const breadcrumb = useMemo(() => breadcrumbFor(pathname), [pathname]);
  const notifications = useAdminLiveAlerts();

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={sidebar.collapsed}
          onToggleCollapsed={sidebar.toggleCollapsed}
          mobileOpen={sidebar.mobileOpen}
          onCloseMobile={sidebar.closeMobile}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            breadcrumb={breadcrumb}
            onOpenMobile={sidebar.openMobile}
            onOpenCommand={palette.openPalette}
            notifications={notifications}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      <CommandPalette open={palette.open} onClose={palette.closePalette} />
    </div>
  );
}
