/**
 * Normalise the indentation of code we paste into the editor / clipboard.
 * Saved approaches frequently come back with 8-space indent (or mixed
 * tabs + spaces) which looks comically airy in Monaco at 14px. We:
 *   1. expand tabs to 4 spaces consistently
 *   2. detect the smallest non-zero leading-space count across all
 *      non-blank lines, and if it's >= 4, divide every line's leading
 *      spaces by that ratio down to 4 — i.e. 8 → 4, 4 → 4, 2 → 2.
 *   3. trim trailing whitespace per line and the trailing blank lines.
 */
export const normaliseIndent = (src) => {
  if (!src) return '';
  const lines = src.replace(/\t/g, '    ').split(/\r?\n/);
  let unit = Infinity;
  for (const ln of lines) {
    if (!ln.trim()) continue;
    const m = ln.match(/^( +)/);
    const lead = m ? m[1].length : 0;
    if (lead > 0 && lead < unit) unit = lead;
  }
  if (!isFinite(unit) || unit <= 4) {
    return lines.map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n{3,}$/, '\n').replace(/\s+$/, '\n');
  }
  const scale = unit / 4;
  return lines.map(l => {
    const m = l.match(/^( +)(.*)$/);
    if (!m) return l.replace(/[ \t]+$/, '');
    const newLead = ' '.repeat(Math.round(m[1].length / scale));
    return (newLead + m[2]).replace(/[ \t]+$/, '');
  }).join('\n').replace(/\s+$/, '\n');
};

/** Render execute output line-by-line with rough error/warn/info colouring. */
export const renderConsole = (text) => {
  if (!text) return [{ key: 'empty', cls: 'dim', text: 'Run your code to see output...' }];
  return text.split('\n').map((l, i) => {
    if (l.startsWith('[ERROR]')) return { key: i, cls: 'err', text: l };
    if (/error|Error|fatal/.test(l)) return { key: i, cls: 'err', text: l };
    if (/warning|Warning/.test(l)) return { key: i, cls: 'warn', text: l };
    if (/note:|info:/i.test(l)) return { key: i, cls: 'info', text: l };
    return { key: i, cls: '', text: l };
  });
};

/** Bare-bones markdown renderer (h1, h2, list, bold, paragraph). */
export const renderMarkdown = (text) => {
  if (!text) return [];
  return text.split('\n').map((l, i) => {
    if (l.startsWith('# ')) return { kind: 'h3', key: i, text: l.slice(2) };
    if (l.startsWith('## ')) return { kind: 'h4', key: i, text: l.slice(3) };
    if (l.startsWith('- ')) return { kind: 'li', key: i, text: l.slice(2) };
    if (l.startsWith('**')) return { kind: 'strong', key: i, text: l.replace(/\*\*/g, '') };
    if (l.startsWith('```') || !l.trim()) return null;
    return { kind: 'p', key: i, text: l };
  }).filter(Boolean);
};
