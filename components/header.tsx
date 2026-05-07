'use client';

import { useState, useEffect } from 'react';
import { BookOpen, History, Settings, Save, Check, Trash2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => Promise<void> | void;
  geminiApiKey: string;
  onGeminiApiKeyChange: (key: string) => Promise<void> | void;
  aiProvider: 'openrouter' | 'gemini';
  onAiProviderChange: (provider: 'openrouter' | 'gemini') => Promise<void> | void;
  onShowHistory: () => void;
  sectionName?: string;
  onOpenSidebar?: () => void;
}

export function Header({ apiKey, onApiKeyChange, geminiApiKey, onGeminiApiKeyChange, aiProvider, onAiProviderChange, onShowHistory, sectionName, onOpenSidebar }: HeaderProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isGeminiSaved, setIsGeminiSaved] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [isSaving, setIsSaving] = useState(false);
  
  // Sync local key with prop
  useEffect(() => {
    setLocalKey(apiKey);
    setIsSaved(!!apiKey);
  }, [apiKey]);

  useEffect(() => {
    setLocalGeminiKey(geminiApiKey);
    setIsGeminiSaved(!!geminiApiKey);
  }, [geminiApiKey]);
  
  const handleSaveKey = async () => {
    if (!localKey) return;
    try {
      setIsSaving(true);
      await onApiKeyChange(localKey);
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    try {
      setIsSaving(true);
      setLocalKey('');
      await onApiKeyChange('');
      setIsSaved(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!localGeminiKey) return;
    try {
      setIsSaving(true);
      await onGeminiApiKeyChange(localGeminiKey);
      setIsGeminiSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGeminiKey = async () => {
    try {
      setIsSaving(true);
      setLocalGeminiKey('');
      await onGeminiApiKeyChange('');
      setIsGeminiSaved(false);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleKeyChange = (value: string) => {
    setLocalKey(value);
    setIsSaved(false);
  };
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onOpenSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSidebar}
              className="md:hidden text-muted-foreground hover:text-foreground"
              aria-label="Open sections"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">ExamForge AI</h1>
            <p className="text-xs text-muted-foreground">Smart Test Generator</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sectionName && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg mr-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm text-foreground font-medium">{sectionName}</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowHistory}
            className="text-muted-foreground hover:text-foreground hidden sm:flex"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowHistory}
            className="text-muted-foreground hover:text-foreground sm:hidden"
          >
            <History className="w-5 h-5" />
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="API key settings"
              >
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">API Key</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">API Keys</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Save your keys and choose which provider to use for test generation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-foreground">AI Provider</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={aiProvider === 'openrouter' ? 'default' : 'outline'}
                      disabled={isSaving}
                      onClick={async () => {
                        try {
                          setIsSaving(true);
                          await onAiProviderChange('openrouter');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="flex-1"
                    >
                      OpenRouter
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={aiProvider === 'gemini' ? 'default' : 'outline'}
                      disabled={isSaving}
                      onClick={async () => {
                        try {
                          setIsSaving(true);
                          await onAiProviderChange('gemini');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="flex-1"
                    >
                      Gemini
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="text-foreground">OpenRouter API Key</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="sk-or-v1-..."
                      value={localKey}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      className="bg-input border-border text-foreground flex-1"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveKey}
                        disabled={!localKey || isSaved || isSaving}
                        variant={isSaved ? "outline" : "default"}
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleDeleteKey}
                        disabled={(!apiKey && !localKey) || isSaving}
                        variant="destructive"
                        size="sm"
                        className="shrink-0"
                        title="Delete API key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="geminiApiKey" className="text-foreground">Google Gemini API Key</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="geminiApiKey"
                      type="password"
                      placeholder="AIza..."
                      value={localGeminiKey}
                      onChange={(e) => {
                        setLocalGeminiKey(e.target.value);
                        setIsGeminiSaved(false);
                      }}
                      className="bg-input border-border text-foreground flex-1"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveGeminiKey}
                        disabled={!localGeminiKey || isGeminiSaved || isSaving}
                        variant={isGeminiSaved ? "outline" : "default"}
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        {isGeminiSaved ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleDeleteGeminiKey}
                        disabled={(!geminiApiKey && !localGeminiKey) || isSaving}
                        variant="destructive"
                        size="sm"
                        className="shrink-0"
                        title="Delete Gemini API key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get your API key from{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
                {isSaved && localKey && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    API key saved - no need to enter again
                  </div>
                )}
                {isGeminiSaved && localGeminiKey && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    Gemini API key saved - no need to enter again
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
