import mammoth from 'mammoth';
import { UploadedFile } from './types';

export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from ${file.name}`);
  }
}

export async function processUploadedFiles(files: File[]): Promise<UploadedFile[]> {
  const processedFiles: UploadedFile[] = [];
  
  for (const file of files) {
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')) {
      const content = await extractTextFromDocx(file);
      processedFiles.push({
        name: file.name,
        content,
        size: file.size,
      });
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const content = await file.text();
      processedFiles.push({
        name: file.name,
        content,
        size: file.size,
      });
    }
  }
  
  return processedFiles;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function combineContent(notes: string, files: UploadedFile[]): string {
  const parts: string[] = [];
  
  if (notes.trim()) {
    parts.push(notes.trim());
  }
  
  for (const file of files) {
    if (file.content.trim()) {
      parts.push(`--- Content from ${file.name} ---\n${file.content.trim()}`);
    }
  }
  
  return parts.join('\n\n');
}
