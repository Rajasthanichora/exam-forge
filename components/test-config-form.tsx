'use client';

import { useState, useEffect } from 'react';
import { Sparkles, FileText, Languages, Settings2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestConfig, Difficulty, Language, UploadedFile, SavedDocument } from '@/lib/types';
import { FileUpload } from './file-upload';
import { SavedDocuments } from './saved-documents';
import { combineContent } from '@/lib/file-handler';

interface TestConfigFormProps {
  onStartTest: (config: TestConfig) => void;
  isLoading: boolean;
  hasApiKey: boolean;
  apiKeyLabel?: string;
  savedDocuments?: SavedDocument[];
  selectedDocIds?: string[];
  onSaveDocument?: (doc: { name: string; content: string; size: number }) => void;
  onRemoveDocument?: (docId: string) => void;
  onSelectDocuments?: (docs: SavedDocument[]) => void;
  pastedNotes?: string;
  onNotesChange?: (notes: string) => void;
  sectionName?: string;
}

const languageOptions: { value: Language; label: string; description: string }[] = [
  { value: 'english', label: 'English', description: 'Questions in English' },
  { value: 'hindi', label: 'Hindi', description: 'Questions in Hindi' },
  { value: 'hinglish', label: 'Hinglish', description: 'Mixed Hindi-English' },
];

const difficultyDescriptions: Record<Difficulty, { label: string; description: string }> = {
  easy: { label: 'Easy', description: 'Basic recall and understanding' },
  medium: { label: 'Medium', description: 'Application of concepts' },
  hard: { label: 'Hard', description: 'Analysis and critical thinking' },
};

export function TestConfigForm({
  onStartTest,
  isLoading,
  hasApiKey,
  apiKeyLabel = 'API',
  savedDocuments = [],
  selectedDocIds = [],
  onSaveDocument,
  onRemoveDocument,
  onSelectDocuments,
  pastedNotes = '',
  onNotesChange,
  sectionName = 'Section',
}: TestConfigFormProps) {
  const [studyNotes, setStudyNotes] = useState(pastedNotes);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(20);
  const [language, setLanguage] = useState<Language>('english');
  const [customPrompt, setCustomPrompt] = useState('');
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload' | 'saved'>('paste');

  // Sync notes with parent
  useEffect(() => {
    setStudyNotes(pastedNotes);
  }, [pastedNotes]);

  const handleNotesChange = (value: string) => {
    setStudyNotes(value);
    onNotesChange?.(value);
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const getCombinedContent = (): string => {
    // Get content from selected saved documents
    const savedDocsContent = savedDocuments
      .filter(doc => selectedDocIds.includes(doc.id))
      .map(doc => doc.content)
      .join('\n\n--- Document Separator ---\n\n');
    
    // Combine with pasted notes and uploaded files
    const pastedAndUploaded = combineContent(studyNotes, uploadedFiles);
    
    if (savedDocsContent && pastedAndUploaded) {
      return `${savedDocsContent}\n\n--- Additional Content ---\n\n${pastedAndUploaded}`;
    }
    
    return savedDocsContent || pastedAndUploaded;
  };

  const totalContent = getCombinedContent();
  const hasContent = totalContent.trim().length > 0;

  const handleSubmit = () => {
    onStartTest({
      studyNotes: totalContent,
      difficulty,
      questionCount,
      language,
      customPrompt,
    });
  };

  // Calculate content sources for summary
  const selectedDocsCount = selectedDocIds.length;
  const hasNotes = studyNotes.trim().length > 0;
  const hasUploads = uploadedFiles.length > 0;

  return (
    <div className="space-y-6">
      {/* Input Method Selection */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            Study Material for {sectionName}
          </CardTitle>
          <CardDescription>
            Use saved documents, paste notes, or upload new DOCX files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as 'paste' | 'upload' | 'saved')}>
            <TabsList className="grid w-full grid-cols-3 bg-secondary">
              <TabsTrigger value="saved" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FolderOpen className="w-4 h-4 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">Saved ({savedDocuments.length})</span>
              </TabsTrigger>
              <TabsTrigger value="paste" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Paste Notes</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Upload DOCX</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="saved" className="mt-4">
              {onSaveDocument && onRemoveDocument && onSelectDocuments ? (
                <SavedDocuments
                  savedDocuments={savedDocuments}
                  onSaveDocument={onSaveDocument}
                  onRemoveDocument={onRemoveDocument}
                  onSelectDocuments={onSelectDocuments}
                  selectedDocIds={selectedDocIds}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved documents available</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="paste" className="mt-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste your study notes here... These notes are automatically saved to this section."
                  value={studyNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="min-h-[250px] bg-input border-border text-foreground placeholder:text-muted-foreground font-mono text-sm"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{studyNotes.length.toLocaleString()} characters (auto-saved)</span>
                  <span>More content = better questions</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="upload" className="mt-4">
              <FileUpload
                onFilesProcessed={setUploadedFiles}
                uploadedFiles={uploadedFiles}
                onRemoveFile={handleRemoveFile}
              />
              {uploadedFiles.length > 0 && onSaveDocument && (
                <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-foreground mb-2">
                    Save uploaded files to this section for future use:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      uploadedFiles.forEach(file => {
                        onSaveDocument({
                          name: file.name,
                          content: file.content,
                          size: file.size,
                        });
                      });
                      setUploadedFiles([]);
                    }}
                    className="w-full"
                  >
                    Save {uploadedFiles.length} File{uploadedFiles.length !== 1 ? 's' : ''} to Section
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Combined Content Summary */}
          {hasContent && (
            <div className="flex flex-col gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-foreground">
                  {totalContent.length.toLocaleString()} characters ready
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {selectedDocsCount > 0 && (
                  <span className="bg-secondary px-2 py-1 rounded">
                    {selectedDocsCount} saved doc{selectedDocsCount !== 1 ? 's' : ''}
                  </span>
                )}
                {hasNotes && (
                  <span className="bg-secondary px-2 py-1 rounded">Pasted notes</span>
                )}
                {hasUploads && (
                  <span className="bg-secondary px-2 py-1 rounded">
                    {uploadedFiles.length} upload{uploadedFiles.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Languages className="w-5 h-5 text-primary" />
            Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={language}
            onValueChange={(v) => setLanguage(v as Language)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
          >
            {languageOptions.map((lang) => (
              <div key={lang.value}>
                <RadioGroupItem
                  value={lang.value}
                  id={`lang-${lang.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`lang-${lang.value}`}
                  className={`flex flex-row sm:flex-col items-center justify-start sm:justify-center rounded-lg border-2 p-3 sm:p-4 cursor-pointer transition-all gap-2 sm:gap-0
                    ${language === lang.value 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-secondary/50 hover:border-primary/50'
                    }`}
                >
                  <span className={`font-medium ${language === lang.value ? 'text-primary' : 'text-foreground'}`}>
                    {lang.label}
                  </span>
                  <span className="text-xs text-muted-foreground text-center sm:mt-1 hidden sm:block">
                    {lang.description}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Test Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Settings2 className="w-5 h-5 text-primary" />
            Test Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Difficulty */}
          <div className="space-y-3">
            <Label className="text-foreground">Difficulty Level</Label>
            <RadioGroup
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as Difficulty)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
            >
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                <div key={level}>
                  <RadioGroupItem
                    value={level}
                    id={level}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={level}
                    className={`flex flex-row sm:flex-col items-center justify-start sm:justify-center rounded-lg border-2 p-3 sm:p-4 cursor-pointer transition-all gap-2 sm:gap-0
                      ${difficulty === level 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border bg-secondary/50 hover:border-primary/50'
                      }`}
                  >
                    <span className={`font-medium capitalize ${difficulty === level ? 'text-primary' : 'text-foreground'}`}>
                      {difficultyDescriptions[level].label}
                    </span>
                    <span className="text-xs text-muted-foreground text-center sm:mt-1 hidden sm:block">
                      {difficultyDescriptions[level].description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Question Count */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-foreground">Number of Questions</Label>
              <span className="text-primary font-bold text-lg">{questionCount}</span>
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={([v]) => setQuestionCount(v)}
              min={10}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10 (Quick)</span>
              <span>30 (Standard)</span>
              <span>50 (Comprehensive)</span>
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-3">
            <Label className="text-foreground">Custom Instructions (Optional)</Label>
            <Textarea
              placeholder="Add specific instructions for the AI... e.g., 'Focus on definitions' or 'Include practical application questions' or 'Create scenario-based questions'"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-[100px] bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button
        onClick={handleSubmit}
        disabled={!hasContent || isLoading || !hasApiKey}
        className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            Generating Unique Questions...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Test
          </>
        )}
      </Button>

      {!hasApiKey && (
        <p className="text-center text-sm text-destructive">
          Please configure your {apiKeyLabel} API key in settings to generate tests.
        </p>
      )}

      {!hasContent && hasApiKey && (
        <p className="text-center text-sm text-muted-foreground">
          Add study material by selecting saved documents, pasting notes, or uploading DOCX files.
        </p>
      )}
    </div>
  );
}
