"use client";

import Link from "next/link";
import { Reorder, useDragControls } from "motion/react";
import { useState, useTransition } from "react";
import { deleteCollectionItem, reorderCollection, setCollectionFlag } from "../actions";
import styles from "../admin.module.css";

export type ListItem = {
  id: string;
  title: string;
  subtitle?: string;
  published?: boolean;
  featured?: boolean;
};

type Props = {
  collection: string;
  singular: string;
  items: ListItem[];
  sortable: boolean;
  hasPublished: boolean;
  hasFeatured: boolean;
};

export function CollectionList({ collection, singular, items: initial, sortable, hasPublished, hasFeatured }: Props) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [orderDirty, setOrderDirty] = useState(false);

  function run(fn: () => Promise<void>, rollback?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        rollback?.();
        setError((e as Error).message);
      }
    });
  }

  function saveOrder(next: ListItem[]) {
    setOrderDirty(false);
    run(() => reorderCollection(collection, next.map((i) => i.id)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    saveOrder(next);
  }

  function toggle(item: ListItem, flag: "published" | "featured") {
    const value = !item[flag];
    const previous = items;
    setItems(items.map((i) => (i.id === item.id ? { ...i, [flag]: value } : i)));
    run(() => setCollectionFlag(collection, item.id, flag, value), () => setItems(previous));
  }

  function remove(item: ListItem) {
    if (!window.confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    const previous = items;
    setItems(items.filter((i) => i.id !== item.id));
    run(() => deleteCollectionItem(collection, item.id), () => setItems(previous));
  }

  if (items.length === 0) {
    return <p className={styles.empty}>No {singular}s yet.</p>;
  }

  const rows = items.map((item, index) => (
    <Row
      key={item.id}
      item={item}
      index={index}
      count={items.length}
      collection={collection}
      sortable={sortable}
      hasPublished={hasPublished}
      hasFeatured={hasFeatured}
      pending={pending}
      onMove={move}
      onToggle={toggle}
      onRemove={remove}
      onDragEnd={() => orderDirty && saveOrder(items)}
    />
  ));

  return (
    <div className={styles.stack}>
      {error ? (
        <p className={styles.alertError} role="alert">
          {error}
        </p>
      ) : null}
      <p className={styles.muted} aria-live="polite">
        {pending ? "Saving…" : sortable ? "Drag the handle or use the arrows to reorder." : " "}
      </p>
      {sortable ? (
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={(next) => {
            setItems(next);
            setOrderDirty(true);
          }}
          className={styles.list}
        >
          {rows}
        </Reorder.Group>
      ) : (
        <ul className={styles.list}>{rows}</ul>
      )}
    </div>
  );
}

function Row({
  item,
  index,
  count,
  collection,
  sortable,
  hasPublished,
  hasFeatured,
  pending,
  onMove,
  onToggle,
  onRemove,
  onDragEnd,
}: {
  item: ListItem;
  index: number;
  count: number;
  collection: string;
  sortable: boolean;
  hasPublished: boolean;
  hasFeatured: boolean;
  pending: boolean;
  onMove: (index: number, delta: number) => void;
  onToggle: (item: ListItem, flag: "published" | "featured") => void;
  onRemove: (item: ListItem) => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);

  const content = (
    <>
      {sortable ? (
        <button
          type="button"
          className={styles.handle}
          aria-label={`Drag to reorder ${item.title}`}
          onPointerDown={(e) => controls.start(e)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
            <rect x="3" y="3" width="3" height="3" />
            <rect x="10" y="3" width="3" height="3" />
            <rect x="3" y="10" width="3" height="3" />
            <rect x="10" y="10" width="3" height="3" />
          </svg>
        </button>
      ) : (
        <span />
      )}
      <div className={styles.rowMain}>
        <Link href={`/admin/${collection}/${item.id}`} className={styles.rowTitle}>
          {item.title}
        </Link>
        {item.subtitle ? <span className={styles.rowSub}>{item.subtitle}</span> : null}
      </div>
      <div className={styles.rowActions}>
        {hasFeatured ? (
          <button
            type="button"
            className={styles.pill}
            aria-pressed={item.featured}
            onClick={() => onToggle(item, "featured")}
            disabled={pending}
          >
            Featured
          </button>
        ) : null}
        {hasPublished ? (
          <button
            type="button"
            className={styles.pill}
            aria-pressed={item.published}
            onClick={() => onToggle(item, "published")}
            disabled={pending}
          >
            {item.published ? "Live" : "Draft"}
          </button>
        ) : null}
        {sortable ? (
          <>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Move ${item.title} up`}
              onClick={() => onMove(index, -1)}
              disabled={index === 0 || pending}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Move ${item.title} down`}
              onClick={() => onMove(index, 1)}
              disabled={index === count - 1 || pending}
            >
              ↓
            </button>
          </>
        ) : null}
        <Link href={`/admin/${collection}/${item.id}`} className={styles.smallButton}>
          Edit
        </Link>
        <button
          type="button"
          className={`${styles.smallButton} ${styles.dangerButton}`}
          onClick={() => onRemove(item)}
          disabled={pending}
        >
          Delete
        </button>
      </div>
    </>
  );

  if (!sortable) return <li className={styles.row}>{content}</li>;

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className={styles.row}
      data-dragging={dragging || undefined}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false);
        onDragEnd();
      }}
    >
      {content}
    </Reorder.Item>
  );
}
