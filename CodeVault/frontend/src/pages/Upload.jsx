import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';
import { Upload as UploadIcon, FileCode, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const Page = styled.div`animation: fadeIn 0.4s ease;`;
const Header = styled.header`margin-bottom: 32px;
  h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 4px; }
  p { color: var(--cv-text-secondary); font-size: 0.9rem; }`;

const DropArea = styled.div`
  border: 2px dashed ${p => p.$active ? 'var(--cv-accent)' : 'var(--cv-border-default)'};
  border-radius: 16px; padding: 48px; text-align: center; cursor: pointer;
  background: ${p => p.$active ? 'var(--cv-accent-muted)' : 'var(--cv-glass-bg)'};
  backdrop-filter: blur(20px); transition: all 0.25s ease;
  &:hover { border-color: var(--cv-accent); background: var(--cv-accent-muted); }
  svg { color: var(--cv-accent); margin-bottom: 16px; }
  .title { font-size: 1rem; font-weight: 600; margin-bottom: 6px; }
  .sub { color: var(--cv-text-muted); font-size: 0.82rem; }`;

const FileList = styled.div`margin-top: 24px; display: flex; flex-direction: column; gap: 8px;`;

const FileRow = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 10px;
  background: var(--cv-glass-bg); border: 1px solid var(--cv-border-subtle);
  svg { width: 18px; height: 18px; flex-shrink: 0; }
  .name { flex: 1; font-size: 0.85rem; font-weight: 500; }
  .size { font-size: 0.75rem; color: var(--cv-text-muted); }
  .status { font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 4px; }
  .status--done { color: var(--cv-success); }
  .status--err { color: var(--cv-danger); }
  .status--pending { color: var(--cv-warning); }`;

const ActionBar = styled.div`
  margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;`;

const Btn = styled.button`
  padding: 10px 24px; border-radius: 10px; border: none; cursor: pointer;
  font-family: inherit; font-size: 0.85rem; font-weight: 600;
  transition: all 0.2s ease;
  ${p => p.$primary ? `
    background: var(--cv-gradient-primary); color: #fff;
    box-shadow: 0 2px 12px rgba(99,102,241,0.25);
    &:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(99,102,241,0.35); }
    &:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }
  ` : `
    background: var(--cv-bg-tertiary); color: var(--cv-text-secondary);
    border: 1px solid var(--cv-border-default);
    &:hover { border-color: var(--cv-border-hover); }
  `}`;

const SUPPORTED_EXT = ['.cpp', '.java', '.py', '.sql', '.c', '.js', '.ts'];

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState({});

  const onDrop = useCallback((accepted) => {
    const valid = accepted.filter(f => SUPPORTED_EXT.some(e => f.name.endsWith(e)));
    setFiles(prev => [...prev, ...valid]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true, noClick: false,
  });

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const text = await file.text();
        const res = await fetch('/api/v1/upload/single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, content: text, language: detectLang(file.name) }),
        });
        setResults(prev => ({ ...prev, [file.name]: res.ok ? 'done' : 'error' }));
      } catch {
        setResults(prev => ({ ...prev, [file.name]: 'error' }));
      }
    }
    setUploading(false);
  };

  const detectLang = (name) => {
    if (name.endsWith('.cpp') || name.endsWith('.c')) return 'cpp';
    if (name.endsWith('.java')) return 'java';
    if (name.endsWith('.py')) return 'python';
    if (name.endsWith('.sql')) return 'sql';
    return 'cpp';
  };

  const clearFiles = () => { setFiles([]); setResults({}); };

  return (
    <Page>
      <Header>
        <h1>Bulk Upload</h1>
        <p>Drop solution files or entire folders. The AI engine parses, analyzes, and catalogs each file automatically.</p>
      </Header>

      <DropArea {...getRootProps()} $active={isDragActive}>
        <input {...getInputProps()} />
        <UploadIcon size={40} />
        <div className="title">{isDragActive ? 'Drop files here...' : 'Drag & drop solution files'}</div>
        <div className="sub">Supports .cpp, .java, .py, .sql — or click to browse</div>
      </DropArea>

      {files.length > 0 && (
        <>
          <FileList>
            {files.map(f => (
              <FileRow key={f.name + f.size}>
                <FileCode style={{ color: 'var(--cv-accent)' }} />
                <span className="name">{f.name}</span>
                <span className="size">{(f.size / 1024).toFixed(1)} KB</span>
                {results[f.name] === 'done' && <span className="status status--done"><CheckCircle size={14} /> Done</span>}
                {results[f.name] === 'error' && <span className="status status--err"><AlertCircle size={14} /> Failed</span>}
                {uploading && !results[f.name] && <span className="status status--pending"><Loader size={14} /> Waiting</span>}
              </FileRow>
            ))}
          </FileList>
          <ActionBar>
            <Btn onClick={clearFiles}>Clear</Btn>
            <Btn $primary onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Processing...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
            </Btn>
          </ActionBar>
        </>
      )}
    </Page>
  );
}
