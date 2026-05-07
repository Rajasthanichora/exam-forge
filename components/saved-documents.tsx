'use client';

import { useState } from 'react';
import { FileText, Trash2, Save, Upload, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SavedDocument, UploadedFile } from '@/lib/types';
import { FileUpload } from './file-upload';

interface SavedDocumentsProps {
  savedDocuments: SavedDocument[];
  onSaveDocument: (doc: { name: string; content: string; size: number }) => void;
  onRemoveDocument: (docId: string) => void;
  onSelectDocuments: (docs: SavedDocument[]) => void;
  selectedDocIds: string[];
}

export function SavedDocuments({
  savedDocuments,
  onSaveDocument,
  onRemoveDocument,
  onSelectDocuments,
  selectedDocIds,
}: SavedDocumentsProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SavedDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<SavedDocument | null>(null);

  const handleSaveUploadedFiles = () => {
    uploadedFiles.forEach(file => {
      onSaveDocument({
        name: file.name,
        content: file.content,
        size: file.size,
      });
    });
    setUploadedFiles([]);
    setIsUploadOpen(false);
  };

  const handleToggleDocument = (doc: SavedDocument) => {
    if (selectedDocIds.includes(doc.id)) {
      onSelectDocuments(savedDocuments.filter(d => d.id !== doc.id && selectedDocIds.includes(d.id)));
    } else {
      const selected = savedDocuments.filter(d => selectedDocIds.includes(d.id));
      onSelectDocuments([...selected, doc]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === savedDocuments.length) {
      onSelectDocuments([]);
    } else {
      onSelectDocuments(savedDocuments);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileText className="w-5 h-5 text-primary" />
                Saved Documents
              </CardTitle>
              <CardDescription>
                Documents are saved to this section and persist across sessions
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {savedDocuments.length} saved
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saved Documents List */}
          {savedDocuments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedDocIds.length} of {savedDocuments.length} selected for test
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedDocIds.length === savedDocuments.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedDocIds.includes(doc.id)
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-secondary/50 border-border hover:border-primary/30'
                    }`}
                    onClick={() => handleToggleDocument(doc)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedDocIds.includes(doc.id)
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    }`}>
                      {selectedDocIds.includes(doc.id) && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(doc.size)} • {formatDate(doc.uploadedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(doc)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload New Documents */}
          <Collapsible open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between border-dashed border-border"
              >
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload New Documents
                </span>
                {isUploadOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <FileUpload
                onFilesProcessed={setUploadedFiles}
                uploadedFiles={uploadedFiles}
                onRemoveFile={(name) => setUploadedFiles(prev => prev.filter(f => f.name !== name))}
              />
              
              {uploadedFiles.length > 0 && (
                <Button
                  onClick={handleSaveUploadedFiles}
                  className="w-full mt-4 bg-primary hover:bg-primary/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save {uploadedFiles.length} Document{uploadedFiles.length !== 1 ? 's' : ''} to Section
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {savedDocuments.length === 0 && !isUploadOpen && (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents saved yet</p>
              <p className="text-xs mt-1">Upload DOCX files to save them for future tests</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete &quot;{deleteTarget?.name}&quot; from this section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  onRemoveDocument(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      <AlertDialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <AlertDialogContent className="bg-card border-border max-w-2xl max-h-[80vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {previewDoc?.name}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-96 overflow-y-auto bg-secondary/50 rounded-lg p-4">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
              {previewDoc?.content.slice(0, 5000)}
              {previewDoc && previewDoc.content.length > 5000 && '...'}
            </pre>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
