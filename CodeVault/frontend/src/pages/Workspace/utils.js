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

/**
 * Render typed console output. `segments` is an array of `{kind, text}` where
 * kind ∈ {'out','err','in','sys'}. Each segment is split into its constituent
 * lines and tagged with a CSS class so user input ('in') can be styled apart
 * from program stdout, stderr, and system notices.
 *
 * Falls back to the legacy single-string `renderConsole` when given a string,
 * so callers that haven't migrated still work.
 */
export const renderOutputSegments = (segments, opts = {}) => {
  if (opts.spinner) return [{ key: 'spinner', cls: 'dim', text: '⏳ Compiling and executing...' }];
  if (typeof segments === 'string') return renderConsole(segments);
  if (!segments || segments.length === 0) {
    return [{ key: 'empty', cls: 'dim', text: 'Run your code to see output...' }];
  }
  const cls = (kind, line) => {
    if (kind === 'in') return 'in';
    if (kind === 'err') return 'err';
    if (kind === 'sys') return 'info';
    if (line.startsWith('[ERROR]')) return 'err';
    if (/error|Error|fatal/.test(line)) return 'err';
    if (/warning|Warning/.test(line)) return 'warn';
    if (/note:|info:/i.test(line)) return 'info';
    return '';
  };
  const out = [];
  segments.forEach((seg, si) => {
    const text = seg.text ?? '';
    // Split keeping a trailing empty so a chunk ending in \n still produces
    // a final blank line. Drop only the synthetic last empty.
    const parts = text.split('\n');
    if (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
    parts.forEach((line, li) => {
      out.push({ key: `${si}-${li}`, cls: cls(seg.kind, line), text: line });
    });
  });
  return out.length ? out : [{ key: 'empty', cls: 'dim', text: 'Run your code to see output...' }];
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
