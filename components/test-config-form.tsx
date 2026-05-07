'use client';

import { useState } from 'react';
import { Sparkles, FileText, Languages, Settings2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestConfig, Difficulty, Language, UploadedFile } from '@/lib/types';
import { FileUpload } from './file-upload';
import { combineContent } from '@/lib/file-handler';

interface TestConfigFormProps {
  onStartTest: (config: TestConfig) => void;
  isLoading: boolean;
  hasApiKey: boolean;
}

const languageOptions: { value: Language; label: string; description: string }[] = [
  { value: 'english', label: 'English', description: 'Questions in English' },
  { value: 'hindi', label: 'Hindi', description: 'Questions in Hindi (हिंदी)' },
  { value: 'hinglish', label: 'Hinglish', description: 'Mixed Hindi-English' },
];

const difficultyDescriptions: Record<Difficulty, { label: string; description: string }> = {
  easy: { label: 'Easy', description: 'Basic recall and understanding' },
  medium: { label: 'Medium', description: 'Application of concepts' },
  hard: { label: 'Hard', description: 'Analysis and critical thinking' },
};

export function TestConfigForm({ onStartTest, isLoading, hasApiKey }: TestConfigFormProps) {
  const [studyNotes, setStudyNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(20);
  const [language, setLanguage] = useState<Language>('english');
  const [customPrompt, setCustomPrompt] = useState('');
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste');

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const getCombinedContent = (): string => {
    return combineContent(studyNotes, uploadedFiles);
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

  return (
    <div className="space-y-6">
      {/* Input Method Selection */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            Study Material Input
          </CardTitle>
          <CardDescription>
            Paste your notes directly or upload DOCX files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as 'paste' | 'upload')}>
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="paste" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="w-4 h-4 mr-2" />
                Paste Notes
              </TabsTrigger>
              <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Shield className="w-4 h-4 mr-2" />
                Upload DOCX
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="paste" className="mt-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste your study notes here... The AI will extract relevant content and generate unique questions based on this material."
                  value={studyNotes}
                  onChange={(e) => setStudyNotes(e.target.value)}
                  className="min-h-[250px] bg-input border-border text-foreground placeholder:text-muted-foreground font-mono text-sm"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{studyNotes.length.toLocaleString()} characters</span>
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
            </TabsContent>
          </Tabs>

          {/* Combined Content Summary */}
          {hasContent && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-foreground">
                <span className="font-medium">{totalContent.length.toLocaleString()}</span> characters of study material ready
              </span>
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
            className="grid grid-cols-3 gap-4"
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
                  className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all
                    ${language === lang.value 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-secondary/50 hover:border-primary/50'
                    }`}
                >
                  <span className={`font-medium ${language === lang.value ? 'text-primary' : 'text-foreground'}`}>
                    {lang.label}
                  </span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
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
              className="grid grid-cols-3 gap-4"
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
                    className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all
                      ${difficulty === level 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border bg-secondary/50 hover:border-primary/50'
                      }`}
                  >
                    <span className={`font-medium capitalize ${difficulty === level ? 'text-primary' : 'text-foreground'}`}>
                      {difficultyDescriptions[level].label}
                    </span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
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
          Please configure your OpenRouter API key in settings to generate tests.
        </p>
      )}

      {!hasContent && hasApiKey && (
        <p className="text-center text-sm text-muted-foreground">
          Add study material by pasting notes or uploading DOCX files to get started.
        </p>
      )}
    </div>
  );
}
