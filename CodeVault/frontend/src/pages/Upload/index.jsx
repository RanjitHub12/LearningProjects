/**
 * Upload — bulk ingestion pipeline.
 *
 * Two-step flow:
 *   1. Pick a destination folder (required).
 *   2. Drop files. Each file is sent to /upload/single, the AI engine returns
 *      a vault problem, and a snippet is mirrored into the chosen folder.
 *
 * On success the user can jump straight from a result card into the Workspace.
 */
import { useState, useEffect, useMemo } from 'react';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { getFolders, createFolder, addSnippet } from '../../lib/folders';

import { Page } from './styles';
import { detectLang } from './constants';
import FolderPicker from './FolderPicker';
import Dropzone from './Dropzone';
import Results, { Processing } from './Results';

export default function UploadPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState({});                   // filename → 'done' | 'error'
  const [analysisResults, setAnalysisResults] = useState([]);   // API responses
  const [currentFile, setCurrentFile] = useState('');

  // Destination folder state. Required before any drop / upload happens.
  const [folders, setFolders] = useState([]);
  const [destFolderId, setDestFolderId] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    setFolders(getFolders());
    const onChange = () => setFolders(getFolders());
    window.addEventListener('cv:folders-changed', onChange);
    return () => window.removeEventListener('cv:folders-changed', onChange);
  }, []);

  // Render folders as an indented dropdown so nested paths read naturally
  // (e.g. "    Hard" under "  May" under "2026").
  const folderOptions = useMemo(() => {
    const byParent = {};
    for (const f of folders) {
      const k = f.parentId || '__root__';
      (byParent[k] = byParent[k] || []).push(f);
    }
    const out = [];
    const walk = (parentId, depth) => {
      const arr = (byParent[parentId || '__root__'] || []).sort((a, b) => a.name.localeCompare(b.name));
      for (const f of arr) {
        out.push({ id: f.id, label: '  '.repeat(depth) + f.name });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [folders]);

  const handleCreateFolder = () => {
    const f = createFolder(newFolderName);
    if (!f) {
      toast({
        kind:'warn', title:'Could not create folder',
        message: newFolderName.trim() ? 'A top-level folder with that name already exists.' : 'Folder name is required.',
      });
      return;
    }
    setDestFolderId(f.id); setNewFolderName(''); setCreatingFolder(false);
    toast({ kind:'success', title:'Folder created', message:`Uploads will land in "${f.name}".` });
  };

  const handleUpload = async () => {
    if (!files.length) return;
    if (!destFolderId) {
      toast({
        kind:'warn', title:'Pick a destination folder',
        message:'Choose or create a folder before uploading so files stay organised.',
      });
      return;
    }
    setUploading(true);
    setAnalysisResults([]);

    let savedToFolder = 0;
    for (const file of files) {
      setCurrentFile(file.name);
      try {
        const text = await file.text();
        const language = detectLang(file.name);
        const res = await fetch('/api/v1/upload/single', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, content: text, language }),
        });
        if (res.ok) {
          const data = await res.json();
          setResults(prev => ({ ...prev, [file.name]: 'done' }));
          setAnalysisResults(prev => [...prev, { ...data, filename: file.name }]);
          // Mirror into the chosen local folder so it shows up alongside
          // hand-authored snippets and is filterable by difficulty / tag.
          try {
            addSnippet({
              folderId: destFolderId,
              title: data.title || file.name,
              language,
              code: text,
              description: data.problem_statement || '',
              difficulty: data.difficulty || '',
              tags: data.dsa_tags || [],
              vaultProblemId: data.problem_id,
            });
            savedToFolder += 1;
          } catch {}
        } else {
          setResults(prev => ({ ...prev, [file.name]: 'error' }));
        }
      } catch {
        setResults(prev => ({ ...prev, [file.name]: 'error' }));
      }
    }
    setUploading(false);
    setCurrentFile('');
    if (savedToFolder > 0) {
      const fname = folders.find(f => f.id === destFolderId)?.name || 'folder';
      toast({
        kind:'success', title:'Uploads filed',
        message:`${savedToFolder} file${savedToFolder === 1 ? '' : 's'} added to "${fname}".`,
      });
    }
  };

  const clearFiles = () => { setFiles([]); setResults({}); setAnalysisResults([]); };

  return (
    <Page>
      <PageHeader
        eyebrow="Ingestion"
        title="Bulk"
        accent="upload."
        subtitle="Drop solution files or entire folders. The AI engine parses each file, then files them into the local folder you pick — so everything stays organised and filterable."
      />

      <FolderPicker
        uploading={uploading}
        folderOptions={folderOptions}
        destFolderId={destFolderId} setDestFolderId={setDestFolderId}
        creatingFolder={creatingFolder} setCreatingFolder={setCreatingFolder}
        newFolderName={newFolderName} setNewFolderName={setNewFolderName}
        handleCreateFolder={handleCreateFolder}/>

      <Dropzone
        destFolderId={destFolderId}
        files={files} setFiles={setFiles}
        results={results}
        uploading={uploading}
        clearFiles={clearFiles}
        handleUpload={handleUpload}/>

      <Processing currentFile={uploading ? currentFile : ''}/>

      <Results analysisResults={analysisResults}/>
    </Page>
  );
}
