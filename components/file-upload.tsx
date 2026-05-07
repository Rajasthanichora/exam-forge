'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadedFile } from '@/lib/types';
import { processUploadedFiles, formatFileSize } from '@/lib/file-handler';

interface FileUploadProps {
  onFilesProcessed: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileName: string) => void;
}

export function FileUpload({ onFilesProcessed, uploadedFiles, onRemoveFile }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = async (files: FileList | File[]) => {
    setError(null);
    setIsProcessing(true);

    try {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => 
        file.name.endsWith('.docx') || file.name.endsWith('.txt')
      );

      if (validFiles.length === 0) {
        setError('Please upload .docx or .txt files only');
        return;
      }

      if (validFiles.length !== fileArray.length) {
        setError('Some files were skipped (only .docx and .txt supported)');
      }

      const processed = await processUploadedFiles(validFiles);
      const newFiles = processed.filter(
        pf => !uploadedFiles.some(uf => uf.name === pf.name)
      );
      
      if (newFiles.length > 0) {
        onFilesProcessed([...uploadedFiles, ...newFiles]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files);
    }
  }, [uploadedFiles, onFilesProcessed]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const totalCharacters = uploadedFiles.reduce((sum, f) => sum + f.content.length, 0);

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Processing files...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${isDragging ? 'bg-primary/20' : 'bg-secondary'}`}>
              <Upload className={`w-6 h-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Drop DOCX files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports multiple .docx and .txt files
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Uploaded Files ({uploadedFiles.length})
            </p>
            <p className="text-xs text-muted-foreground">
              {totalCharacters.toLocaleString()} characters total
            </p>
          </div>
          
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <Card key={file.name} className="bg-secondary/50 border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.content.length.toLocaleString()} chars
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(file.name);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
