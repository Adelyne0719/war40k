

export function FormattedDescription({ text, className }: { text: string, className?: string }) {
  if (!text) return null;

  const regex = /(\^\^\*\*.*?\^\^\*\*|\*\*.*?\*\*|\[.*?\])/g;
  const parts = text.split(regex);

  return (
    <div className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('^^**') && part.endsWith('^^**')) {
          const content = part.slice(4, -4);
          return <span key={i} className="font-serif font-bold tracking-wide">{content}</span>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          const content = part.slice(2, -2);
          return <strong key={i} className="font-bold text-slate-200">{content}</strong>;
        }
        if (part.startsWith('[') && part.endsWith(']')) {
          return <span key={i} className="text-amber-500 italic font-semibold">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
