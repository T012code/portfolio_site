import styles from "./RichText.module.css";

type Block = { type: "h2" | "h3" | "p"; text: string } | { type: "ul"; items: string[] };

/** Plain text with "## " headings, "### " subheadings and "- " bullets. Rendered as text, never HTML. */
export function parseRichText(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith("### ")) {
      flush();
      blocks.push({ type: "h3", text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h2", text: line.slice(3) });
    } else if (line.startsWith("- ")) {
      flush();
      const last = blocks.at(-1);
      if (last?.type === "ul") last.items.push(line.slice(2));
      else blocks.push({ type: "ul", items: [line.slice(2)] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export function RichText({ source, className }: { source: string; className?: string }) {
  return (
    <div className={`${styles.rich} ${className ?? ""}`}>
      {parseRichText(source).map((b, i) => {
        if (b.type === "ul") {
          return (
            <ul key={i}>
              {b.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        const Tag = b.type;
        return <Tag key={i}>{b.text}</Tag>;
      })}
    </div>
  );
}
