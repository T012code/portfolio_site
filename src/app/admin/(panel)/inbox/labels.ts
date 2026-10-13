/** "replied" is what's stored; "Responded" is what it means in the inbox. */
export const statusLabel = (s: string) => (s === "replied" ? "Responded" : s[0].toUpperCase() + s.slice(1));
