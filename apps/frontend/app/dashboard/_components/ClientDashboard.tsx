"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ComplianceKpis } from "@/components/core/ComplianceKPIs";
import { AnomaliesTable } from "@/components/core/AnomaliesTable";
import { SearchBox } from "@/components/core/SearchBox";
import { UploadPanel } from "@/components/core/UploadPanel";
import { DocumentsPanel } from "@/components/core/DocumentsPanel";

export default function ClientDashboard() {
  const [refreshToken, setRefreshToken] = React.useState<number>(0);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="space-y-6 p-4 lg:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <ComplianceKpis refreshToken={refreshToken} />
              <h2 className="text-base font-semibold">Portfolio Anomalies</h2>
              <AnomaliesTable refreshToken={refreshToken} />
              <h2 className="text-base font-semibold">Documents</h2>
              <DocumentsPanel onPick={(id) => window.location.href = `/doc/${id}`} />
            </div>
            <div className="space-y-6">
              <UploadPanel onUploaded={() => setRefreshToken(Date.now())} />
              <div className="space-y-4">
                <h2 className="text-base font-semibold">Semantic Search</h2>
                <SearchBox />
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
