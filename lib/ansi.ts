const FG = ['#000', '#cd3131', '#0dbc79', '#e5e510', '#2472c8', '#bc3fbc', '#11a8cd', '#e5e5e5'];
const BRIGHT = ['#666', '#f14c4c', '#23d18b', '#f5f543', '#3b8eea', '#d670d6', '#29b8db', '#fff'];

export type AnsiSegment = { text: string; bold?: boolean; underline?: boolean; fg?: string; bg?: string };

export function parseAnsi(input: string): AnsiSegment[] {
  const out: AnsiSegment[] = [];
  const re = /\[([\d;]+)m/g;
  let s: Omit<AnsiSegment, 'text'> = {};
  let i = 0;
  for (let m; (m = re.exec(input)); ) {
    if (m.index > i) out.push({ ...s, text: input.slice(i, m.index) });
    i = m.index + m[0].length;
    for (const c of m[1].split(';').map(Number)) {
      if (c === 0) s = {};
      else if (c === 1) s = { ...s, bold: true };
      else if (c === 4) s = { ...s, underline: true };
      else if (c >= 30 && c <= 37) s = { ...s, fg: FG[c - 30] };
      else if (c >= 90 && c <= 97) s = { ...s, fg: BRIGHT[c - 90] };
      else if (c >= 40 && c <= 47) s = { ...s, bg: FG[c - 40] };
      else if (c >= 100 && c <= 107) s = { ...s, bg: BRIGHT[c - 100] };
    }
  }
  if (i < input.length) out.push({ ...s, text: input.slice(i) });
  return out;
}
