import { useDropzone } from 'react-dropzone';
import {
  Upload as UploadIcon, FileCode, CheckCircle, AlertCircle, Loader,
} from 'lucide-react';
import { DropArea, FileList, FileRow, ActionBar, Btn } from './styles';
import { SUPPORTED_EXT } from './constants';

/** Drop area + the list of staged files + Clear / Upload action bar. */
export default function Dropzone({
  destFolderId,
  files, setFiles,
  results,
  uploading,
  clearFiles,
  handleUpload,
}) {
  const onDrop = (accepted) => {
    const valid = accepted.filter(f => SUPPORTED_EXT.some(e => f.name.endsWith(e)));
    setFiles(prev => [...prev, ...valid]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true, noClick: false,
  });

  const dropDisabled = !destFolderId;

  return (
    <>
      <DropArea {...getRootProps()} $active={isDragActive}
        style={dropDisabled ? { opacity:.55, pointerEvents:'none', filter:'grayscale(.3)' } : undefined}>
        <input {...getInputProps()} />
        <UploadIcon size={40} />
        <div className="title">
          {dropDisabled
            ? 'Pick a destination folder first'
            : isDragActive
              ? 'Drop files here…'
              : 'Drag & drop solution files'}
        </div>
        <div className="sub">
          {dropDisabled
            ? 'Step 1 above unlocks this.'
            : 'Supports .cpp, .java, .py, .sql — or click to browse'}
        </div>
      </DropArea>

      {files.length > 0 && (
        <>
          <FileList>
            {files.map(f => (
              <FileRow key={f.name + f.size}>
                <FileCode style={{ color:'var(--cv-accent)' }} />
                <span className="name">{f.name}</span>
                <span className="size">{(f.size / 1024).toFixed(1)} KB</span>
                {results[f.name] === 'done' && (
                  <span className="status status--done"><CheckCircle size={14} /> Analyzed</span>
                )}
                {results[f.name] === 'error' && (
                  <span className="status status--err"><AlertCircle size={14} /> Failed</span>
                )}
                {uploading && !results[f.name] && (
                  <span className="status status--pending"><Loader size={14} /> Queued</span>
                )}
              </FileRow>
            ))}
          </FileList>
          <ActionBar>
            <Btn onClick={clearFiles}>Clear</Btn>
            <Btn $primary onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Analyzing...' : `Upload & Analyze ${files.length} file${files.length > 1 ? 's' : ''}`}
            </Btn>
          </ActionBar>
        </>
      )}
    </>
  );
}
