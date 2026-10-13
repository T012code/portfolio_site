// Renders a heading with its last `count` words in the cobalt voice.
export function TwoTone({ text, count = 1 }: { text: string; count?: number }) {
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return <span className="tone">{text}</span>;
  const head = words.slice(0, -count).join(" ");
  const tail = words.slice(-count).join(" ");
  return (
    <>
      {head} <span className="tone">{tail}</span>
    </>
  );
}
