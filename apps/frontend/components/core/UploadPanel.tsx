"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function UploadPanel({
  onUploaded,
  children,
}: {
  onUploaded: () => void;
  children: React.ReactNode; // trigger button
}) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function doUpload() {
    if (!file) return;
    setBusy(true);
    try {
      await api.upload(file);
      toast.success("Uploaded");
      setOpen(false);
      onUploaded();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload PDF</DialogTitle>
        </DialogHeader>
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <DialogFooter>
          <Button onClick={doUpload} disabled={!file || busy}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
