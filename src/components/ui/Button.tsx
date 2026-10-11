import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "inverse";

type Common = {
  variant?: Variant;
  icon?: IconName | null;
  block?: boolean;
  children: ReactNode;
};

function classes(variant: Variant, block?: boolean, extra?: string) {
  return [styles.button, styles[variant], block ? styles.block : "", extra ?? ""].filter(Boolean).join(" ");
}

function Inner({ children, icon }: { children: ReactNode; icon?: IconName | null }) {
  return (
    <>
      <span className={styles.label}>{children}</span>
      {icon ? (
        <span className={styles.icon}>
          <Icon name={icon} size={18} />
        </span>
      ) : null}
    </>
  );
}

export function ButtonLink({
  variant = "primary",
  icon = "arrow-right",
  block,
  className,
  children,
  ...props
}: Common & Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link className={classes(variant, block, className)} {...props}>
      <Inner icon={icon}>{children}</Inner>
    </Link>
  );
}

export function ButtonAnchor({
  variant = "primary",
  icon = "arrow-up-right",
  block,
  className,
  children,
  ...props
}: Common & Omit<ComponentProps<"a">, "children">) {
  return (
    <a className={classes(variant, block, className)} {...props}>
      <Inner icon={icon}>{children}</Inner>
    </a>
  );
}

export function Button({
  variant = "primary",
  icon = "arrow-right",
  block,
  loading,
  className,
  children,
  disabled,
  ...props
}: Common & { loading?: boolean } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      className={classes(variant, block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      <Inner icon={loading ? "loader" : icon}>{children}</Inner>
    </button>
  );
}
