import React from 'react';

/**
 * Shows text an owner typed (listing description, neighbourhood notes) with simple structure,
 * without ever rendering HTML:
 *  - a blank line starts a new paragraph; a single line break stays a line break;
 *  - lines starting with "-", "*" or "•" become a bulleted list;
 *  - **text** between double asterisks is bold;
 *  - a short line ending in ":" on its own (e.g. "Main floor:") is shown as a small heading.
 */

type Block = { kind: 'p'; lines: string[] } | { kind: 'ul'; items: string[] } | { kind: 'h'; text: string };

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const para of text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
    let cur: Block | null = null;
    for (const line of lines) {
      if (BULLET.test(line) && !/^\*\*/.test(line)) {
        const item = line.replace(BULLET, '');
        if (cur?.kind === 'ul') cur.items.push(item);
        else blocks.push((cur = { kind: 'ul', items: [item] }));
      } else if (line.length <= 60 && /:$/.test(line.replace(/\*\*/g, ''))) {
        blocks.push({ kind: 'h', text: line.replace(/\*\*/g, '').replace(/:$/, '') });
        cur = null;
      } else if (cur?.kind === 'p') {
        cur.lines.push(line);
      } else {
        blocks.push((cur = { kind: 'p', lines: [line] }));
      }
    }
  }
  return blocks;
}

/** Turns **bold** into <strong>; everything else stays plain text. */
function inline(text: string, keyBase: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={`${keyBase}-${i}`} className="font-semibold text-slate-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={`${keyBase}-${i}`}>{part}</React.Fragment>
    )
  );
}

export const FormattedText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const blocks = parseBlocks(text);
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {blocks.map((b, i) =>
        b.kind === 'ul' ? (
          <ul key={i} className="list-disc pl-6 flex flex-col gap-1">
            {b.items.map((item, j) => (
              <li key={j}>{inline(item, `${i}-${j}`)}</li>
            ))}
          </ul>
        ) : b.kind === 'h' ? (
          <h3 key={i} className="font-semibold text-slate-900 -mb-2">
            {inline(b.text, `${i}`)}
          </h3>
        ) : (
          <p key={i}>
            {b.lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {inline(line, `${i}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
};
