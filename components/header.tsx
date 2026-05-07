'use client';

import { useState, useEffect } from 'react';
import { BookOpen, History, Settings, Save, Check } from 'lucide-react';
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

const API_KEY_STORAGE = 'examforge_openrouter_key';

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onShowHistory: () => void;
  sectionName?: string;
}

export function Header({ apiKey, onApiKeyChange, onShowHistory, sectionName }: HeaderProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);
  
  // Sync local key with prop
  useEffect(() => {
    setLocalKey(apiKey);
    // Check if saved in localStorage
    const savedKey = localStorage.getItem(API_KEY_STORAGE);
    setIsSaved(!!savedKey && savedKey === apiKey);
  }, [apiKey]);
  
  const handleSaveKey = () => {
    if (localKey) {
      localStorage.setItem(API_KEY_STORAGE, localKey);
      onApiKeyChange(localKey);
      setIsSaved(true);
    }
  };
  
  const handleKeyChange = (value: string) => {
    setLocalKey(value);
    setIsSaved(false);
  };
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
            className="text-muted-foreground hover:text-foreground"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Settings className="w-4 h-4 mr-2" />
                API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">OpenRouter API Key</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Enter your OpenRouter API key to enable AI-powered test generation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="text-foreground">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="sk-or-v1-..."
                      value={localKey}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      className="bg-input border-border text-foreground flex-1"
                    />
                    <Button
                      onClick={handleSaveKey}
                      disabled={!localKey || isSaved}
                      variant={isSaved ? "outline" : "default"}
                      size="sm"
                      className="shrink-0"
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
                    API key saved to memory - no need to enter again
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
