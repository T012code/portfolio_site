import type { SVGProps } from "react";
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from "./paths";

type Props = SVGProps<SVGSVGElement> & { title?: string };

export function Wordmark({ title, ...props }: Props) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d={WORDMARK_PATH} />
    </svg>
  );
}
