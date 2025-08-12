// Create a new file at: components/core/SearchResultsTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type SearchResult } from "@/lib/api";

interface SearchResultsTableProps {
  results: SearchResult;
}

export function SearchResultsTable({ results }: SearchResultsTableProps) {
  if (results.results.length === 0) {
    return <p className="text-muted-foreground">No search results found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Doc</TableHead>
          <TableHead>Page</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Snippet</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.results.map((result) => (
          <TableRow key={result.id}>
            <TableCell>{result.document_id}</TableCell>
            <TableCell>{result.page_number}</TableCell>
            <TableCell>{result.score}</TableCell>
            <TableCell>{result.text}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}