import { ViewTransition } from "react";

// Route change: the old page lifts away and the new one wipes up from below.
// Styles: ::view-transition-*(.page) in globals.css. Browsers without support just swap.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
