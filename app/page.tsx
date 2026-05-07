'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { TestConfigForm } from '@/components/test-config-form';
import { QuizInterface } from '@/components/quiz-interface';
import { TestResults } from '@/components/test-results';
import { TestHistory } from '@/components/test-history';
import { StatsCard } from '@/components/stats-card';
import { FeaturesSection } from '@/components/features-section';
import { SimilarityIndicator } from '@/components/similarity-indicator';
import { Question, TestConfig, TestResult, SimilarityReport } from '@/lib/types';
import { saveTestResult, getStoredQuestions, generateSimilarityReport } from '@/lib/test-store';
import { Toaster as SonnerToaster, toast } from 'sonner';

type AppView = 'config' | 'quiz' | 'results' | 'history' | 'similarity';

const API_KEY_STORAGE = 'examforge_openrouter_key';

export default function Home() {
  const [view, setView] = useState<AppView>('config');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentConfig, setCurrentConfig] = useState<TestConfig | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [similarityReport, setSimilarityReport] = useState<SimilarityReport | null>(null);

  // Load API key from storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  // Save API key to storage when changed
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE, key);
  };

  const handleStartTest = async (config: TestConfig) => {
    setIsLoading(true);
    setCurrentConfig(config);

    try {
      const storedQuestions = getStoredQuestions();
      
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config,
          apiKey,
          storedQuestions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate test');
      }

      // Generate similarity report
      const questionTexts = data.questions.map((q: Question) => q.question);
      const report = generateSimilarityReport(questionTexts);
      setSimilarityReport(report);

      setQuestions(data.questions);
      setAnswers({});
      
      // Show similarity report first if there are stored questions
      if (storedQuestions.length > 0) {
        setView('similarity');
      } else {
        setView('quiz');
      }
      
      toast.success(`Generated ${data.questions.length} questions!`);
    } catch (error) {
      console.error('Error generating test:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate test');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuizFromSimilarity = () => {
    setView('quiz');
  };

  const handleQuizComplete = (userAnswers: Record<string, number>, time: number) => {
    setAnswers(userAnswers);
    setTimeTaken(time);
    
    // Calculate score
    const correctCount = questions.filter(
      (q) => userAnswers[q.id] === q.correctAnswer
    ).length;

    // Save result to history
    const result: TestResult = {
      id: `test-${Date.now()}`,
      date: new Date().toISOString(),
      config: currentConfig!,
      questions,
      answers: userAnswers,
      score: correctCount,
      totalQuestions: questions.length,
      timeTaken: time,
    };
    
    saveTestResult(result);
    setView('results');
  };

  const handleRetry = () => {
    setAnswers({});
    setView('quiz');
  };

  const handleNewTest = () => {
    setQuestions([]);
    setAnswers({});
    setCurrentConfig(null);
    setSimilarityReport(null);
    setView('config');
  };

  const handleShowHistory = () => {
    setView('history');
  };

  const handleCloseHistory = () => {
    setView('config');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        onShowHistory={handleShowHistory}
      />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {view === 'config' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-foreground text-balance">
                AI-Powered Test Generator
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
                Transform your study notes into unique practice tests. Intelligent tracking ensures no question repetition.
              </p>
            </div>
            <StatsCard />
            <FeaturesSection />
            <TestConfigForm
              onStartTest={handleStartTest}
              isLoading={isLoading}
              hasApiKey={!!apiKey}
            />
          </div>
        )}

        {view === 'similarity' && similarityReport && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Test Generated Successfully</h2>
              <p className="text-muted-foreground">Review the uniqueness report before starting your test</p>
            </div>
            
            <SimilarityIndicator report={similarityReport} />
            
            <div className="flex gap-4">
              <button
                onClick={handleNewTest}
                className="flex-1 py-3 px-4 rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              >
                Generate New Test
              </button>
              <button
                onClick={handleStartQuizFromSimilarity}
                className="flex-1 py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                Start Test ({questions.length} Questions)
              </button>
            </div>
          </div>
        )}

        {view === 'quiz' && (
          <QuizInterface questions={questions} onComplete={handleQuizComplete} />
        )}

        {view === 'results' && currentConfig && (
          <TestResults
            questions={questions}
            answers={answers}
            config={currentConfig}
            timeTaken={timeTaken}
            onRetry={handleRetry}
            onNewTest={handleNewTest}
          />
        )}

        {view === 'history' && <TestHistory onClose={handleCloseHistory} />}
      </main>

      <SonnerToaster 
        position="top-center" 
        richColors 
        toastOptions={{
          style: {
            background: 'var(--popover)',
            color: 'var(--popover-foreground)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </div>
  );
}
