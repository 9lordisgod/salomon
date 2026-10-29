export type MaskEntry = { token: string; original: string; kind: 'email' | 'phone' | 'handle' | 'name' | 'codename' };

const PATTERNS: { kind: MaskEntry['kind']; re: RegExp }[] = [
  { kind: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: 'phone', re: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
  { kind: 'handle', re: /(?<![\w@])@[A-Za-z0-9_]{2,30}\b/g },
  { kind: 'codename', re: /\b(?:codename|code name|source)\s*[:=]?\s*"?([A-Z][A-Za-z]+)"?/g },
  // Demo heuristic: two consecutive capitalized words (e.g. "Maria Lopez").
  { kind: 'name', re: /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2}\b/g },
];

const STOP = new Set(['The', 'This', 'That', 'When', 'Then', 'City Hall', 'New York', 'United States']);

/** Demo masking. Deterministic tokens per original value. Not a production NER model. */
export function maskText(input: string, existing: MaskEntry[] = []) {
  const map = [...existing];
  const find = (o: string) => map.find((m) => m.original === o);
  let text = input;
  for (const { kind, re } of PATTERNS) {
    text = text.replace(re, (match, group?: string) => {
      if (/^\[[A-Z]+-\d+\]$/.test(match)) return match;
      const original = kind === 'codename' && typeof group === 'string' ? group : match;
      if (kind === 'name' && STOP.has(original)) return match;
      let e = find(original);
      if (!e) {
        const n = map.filter((m) => m.kind === kind).length + 1;
        e = { token: `[${kind.toUpperCase()}-${n}]`, original, kind };
        map.push(e);
      }
      return kind === 'codename' && typeof group === 'string' ? match.replace(group, e.token) : e.token;
    });
  }
  return { text, map };
}
