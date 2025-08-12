"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Upload } from "lucide-react";
import { AnomaliesTable } from "@/components/core/AnomaliesTable";
import { DocumentsPanel } from "@/components/core/DocumentsPanel";
import { UploadPanel } from "@/components/core/UploadPanel";
import { ComplianceKPIs } from "@/components/core/ComplianceKPIs";
import { api, type SearchResult } from "@/lib/api";
import { SearchResultsTable } from "@/components/core/SearchResults";

export default function EnhancedDashboard() {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SearchResult | null>(null);
  const [refreshToken, setRefreshToken] = React.useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await api.search(searchQuery);
      setSearchResults(results);
      setActiveTab("search");
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewDocument = (id: number) => {
    window.location.href = `/doc/${id}/viewer`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Risk Explorer</h1>
          <p className="text-muted-foreground">Analyze and manage your portfolio risks</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search across documents..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
          <UploadPanel onUploaded={() => setRefreshToken(t => t + 1)}>
            <Button variant="outline" type="button">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </UploadPanel>
        </form>
      </div>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="search" disabled={searchResults?.results.length === 0}>
            Search {searchResults?.results.length > 0 && `(${searchResults?.results.length})`}
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ComplianceKPIs refreshToken={refreshToken} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
            </CardHeader>
            <CardContent>
              {searchResults?.results?.length > 0 ? (
                <SearchResultsTable results={searchResults} />
              ) : (
                <p className="text-muted-foreground">No search results yet. Enter a query above.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentsPanel 
                key={refreshToken}
                refreshToken={refreshToken}
                onView={handleViewDocument}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Anomalies</CardTitle>
            </CardHeader>
            <CardContent>
              <AnomaliesTable refreshToken={refreshToken} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}