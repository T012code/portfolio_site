"use client";

import { Button } from "@/components/ui/Button";

// Opens the browser's print dialog; the Resume page has a print stylesheet, so "Save as PDF" gives a clean CV.
export function PrintButton({ label, variant = "primary" }: { label: string; variant?: "primary" | "secondary" }) {
  return (
    <Button type="button" variant={variant} icon="download" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
