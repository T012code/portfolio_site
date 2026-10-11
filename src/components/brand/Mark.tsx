import type { SVGProps } from "react";
import { MARK_PATHS, MARK_VIEWBOX } from "./paths";

type Props = SVGProps<SVGSVGElement> & { title?: string };

export function Mark({ title, ...props }: Props) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {MARK_PATHS.map((d) => (
        <path key={d.slice(0, 16)} d={d} />
      ))}
    </svg>
  );
}
