// File extensions accepted by the dropzone.
export const SUPPORTED_EXT = ['.cpp', '.java', '.py', '.sql', '.c', '.js', '.ts'];

/** Map a filename to the language id the backend understands. */
export const detectLang = (name) => {
  if (name.endsWith('.cpp') || name.endsWith('.c')) return 'cpp';
  if (name.endsWith('.java')) return 'java';
  if (name.endsWith('.py')) return 'python';
  if (name.endsWith('.sql')) return 'sql';
  return 'cpp';
};
