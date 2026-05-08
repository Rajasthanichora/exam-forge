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
import { toast } from 'sonner';

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => Promise<void> | void;
  geminiApiKey: string;
  onGeminiApiKeyChange: (key: string) => Promise<void> | void;
  aiProvider: 'openrouter' | 'gemini';
  onAiProviderChange: (provider: 'openrouter' | 'gemini') => Promise<void> | void;
  openRouterModel: string;
  geminiModel: string;
  onOpenRouterModelChange: (model: string) => Promise<void> | void;
  onGeminiModelChange: (model: string) => Promise<void> | void;
  onShowHistory: () => void;
  sectionName?: string;
  onOpenSidebar?: () => void;
}

type ModelOption = { value: string; label: string };

const DEFAULT_OPENROUTER_FREE_MODELS: ModelOption[] = [
  { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (Free)' },
  { value: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B IT (Free)' },
  { value: 'qwen/qwen3-32b:free', label: 'Qwen 3 32B (Free)' },
  { value: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1 24B (Free)' },
];

const DEFAULT_GEMINI_MODELS: ModelOption[] = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
];

export function Header({
  apiKey,
  onApiKeyChange,
  geminiApiKey,
  onGeminiApiKeyChange,
  aiProvider,
  onAiProviderChange,
  openRouterModel,
  geminiModel,
  onOpenRouterModelChange,
  onGeminiModelChange,
  onShowHistory,
  sectionName,
  onOpenSidebar,
}: HeaderProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isGeminiSaved, setIsGeminiSaved] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [isSaving, setIsSaving] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<ModelOption[]>(DEFAULT_OPENROUTER_FREE_MODELS);
  const [geminiModels, setGeminiModels] = useState<ModelOption[]>(DEFAULT_GEMINI_MODELS);
  
  // Sync local key with prop
  useEffect(() => {
    setLocalKey(apiKey);
    setIsSaved(!!apiKey);
  }, [apiKey]);

  useEffect(() => {
    setLocalGeminiKey(geminiApiKey);
    setIsGeminiSaved(!!geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    const fetchOpenRouterModels = async () => {
      if (!localKey) {
        setOpenRouterModels(DEFAULT_OPENROUTER_FREE_MODELS);
        return;
      }

      try {
        const response = await fetch('/api/free-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'openrouter', apiKey: localKey }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to fetch OpenRouter models');
        }

        const models = Array.isArray(payload?.models) && payload.models.length > 0
          ? payload.models
          : DEFAULT_OPENROUTER_FREE_MODELS;

        setOpenRouterModels(models);
        if (!models.some((model: ModelOption) => model.value === openRouterModel)) {
          onOpenRouterModelChange(models[0].value);
        }
      } catch (error) {
        setOpenRouterModels(DEFAULT_OPENROUTER_FREE_MODELS);
      }
    };

    fetchOpenRouterModels();
  }, [localKey, openRouterModel]);

  useEffect(() => {
    const fetchGeminiModels = async () => {
      if (!localGeminiKey) {
        setGeminiModels(DEFAULT_GEMINI_MODELS);
        return;
      }

      try {
        const response = await fetch('/api/free-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'gemini', apiKey: localGeminiKey }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to fetch Gemini models');
        }

        const models = Array.isArray(payload?.models) && payload.models.length > 0
          ? payload.models
          : DEFAULT_GEMINI_MODELS;

        setGeminiModels(models);
        if (!models.some((model: ModelOption) => model.value === geminiModel)) {
          onGeminiModelChange(models[0].value);
        }
      } catch {
        setGeminiModels(DEFAULT_GEMINI_MODELS);
      }
    };

    fetchGeminiModels();
  }, [localGeminiKey, geminiModel]);
  
  const handleSaveKey = async () => {
    if (!localKey) return;
    try {
      setIsSaving(true);
      await onApiKeyChange(localKey);
      setIsSaved(true);
      toast.success('OpenRouter key synced to cloud');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'OpenRouter key sync failed');
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
      toast.success('OpenRouter key removed from cloud');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'OpenRouter key delete failed');
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
      toast.success('Gemini key synced to cloud');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gemini key sync failed');
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
      toast.success('Gemini key removed from cloud');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gemini key delete failed');
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
                  <Label htmlFor="openrouterModel" className="text-foreground">OpenRouter Free Model</Label>
                  <select
                    id="openrouterModel"
                    value={openRouterModel}
                    onChange={(e) => onOpenRouterModelChange(e.target.value)}
                    disabled={isSaving || !localKey}
                    className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground disabled:opacity-50"
                  >
                    {openRouterModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                  {!localKey && (
                    <p className="text-xs text-muted-foreground">OpenRouter key save karne ke baad model use hoga.</p>
                  )}
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
                <div className="space-y-2">
                  <Label htmlFor="geminiModel" className="text-foreground">Gemini Free Model</Label>
                  <select
                    id="geminiModel"
                    value={geminiModel}
                    onChange={(e) => onGeminiModelChange(e.target.value)}
                    disabled={isSaving || !localGeminiKey}
                    className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground disabled:opacity-50"
                  >
                    {geminiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                  {!localGeminiKey && (
                    <p className="text-xs text-muted-foreground">Gemini key save karne ke baad model use hoga.</p>
                  )}
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
