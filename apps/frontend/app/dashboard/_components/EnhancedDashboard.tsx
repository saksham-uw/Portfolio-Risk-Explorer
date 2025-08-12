"use client";

import * as React from "react";
import { AppSidebar } from "@/components/core/AppSidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { AnomaliesTable } from "@/components/core/AnomaliesTable";
import { DocumentsPanel } from "@/components/core/DocumentsPanel";
import { UploadPanel } from "@/components/core/UploadPanel";
import { ComplianceKPIs } from "@/components/core/ComplianceKPIs";

export default function EnhancedDashboard() {
  const [tab, setTab] = React.useState("overview");
  const [refreshToken, setRefreshToken] = React.useState(0);

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="border-b bg-background">
          <div className="flex h-14 items-center gap-3 px-4">
            <h1 className="text-base font-semibold">
              {tab === "overview" ? "Portfolio Overview"
                : tab === "documents" ? "Documents"
                : "Anomalies"}
            </h1>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Input
                  placeholder="Search…"
                  className="w-[220px] pl-3"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // optional: wire to /api/search?q=
                      window.location.href = `/search?q=${encodeURIComponent(
                        (e.target as HTMLInputElement).value
                      )}`;
                    }
                  }}
                />
              </div>
              <UploadPanel
                onUploaded={() => setRefreshToken((t) => t + 1)}
              />
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <ComplianceKPIs refreshToken={refreshToken} />
            </TabsContent>

            <TabsContent value="documents">
              <DocumentsPanel
                refreshToken={refreshToken}
                onView={(id) => (window.location.href = `/doc/${id}/viewer`)}
              />
            </TabsContent>

            <TabsContent value="anomalies">
              <AnomaliesTable refreshToken={refreshToken} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
