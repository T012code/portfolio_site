import styles from "./Tag.module.css";

export function TagList({ tags, label }: { tags: string[]; label?: string }) {
  if (tags.length === 0) return null;
  return (
    <ul className={styles.list} aria-label={label}>
      {tags.map((tag) => (
        <li key={tag} className={styles.tag}>
          {tag}
        </li>
      ))}
    </ul>
  );
}
