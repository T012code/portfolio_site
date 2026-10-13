import { ViewTransition } from "react";

// Route change: the old page lifts away and the new one wipes up from below.
// A fixed name (not a view-transition class) so every browser with view transitions,
// including Safari before 18.2, targets it: ::view-transition-*(page) in globals.css.
// Browsers without support just swap.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition name="page" share="page" enter="page" exit="page" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
