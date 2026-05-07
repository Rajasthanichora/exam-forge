'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { TestConfigForm } from '@/components/test-config-form';
import { QuizInterface } from '@/components/quiz-interface';
import { TestResults } from '@/components/test-results';
import { SectionSidebar } from '@/components/section-sidebar';
import { SectionHistory } from '@/components/section-history';
import { SimilarityIndicator } from '@/components/similarity-indicator';
import { Question, TestConfig, TestResult, SimilarityReport, Section, SavedDocument } from '@/lib/types';
import { DebugPanel } from '@/components/debug-panel';
import { logInfo, logError, logSuccess, logSupabase, logWarn } from '@/lib/debug-logger';
import {
  getAppData,
  saveAppData,
  createSection,
  getAllSections,
  getSection,
  setActiveSection,
  renameSection,
  deleteSection,
  addDocumentToSection,
  removeDocumentFromSection,
  updateSectionNotes,
  saveTestResultToSection,
  updateTestResultInSection,
  renameTestResult,
  deleteTestResult,
  generateSimilarityReportForSection,
  getSectionStats,
  clearSectionData,
  initializeFromSupabase,
  isSupabaseConnected,
} from '@/lib/section-store';
import { Toaster as SonnerToaster, toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

type AppView = 'config' | 'quiz' | 'results' | 'history' | 'similarity';

const API_KEY_STORAGE = 'examforge_openrouter_key';
const GEMINI_KEY_STORAGE = 'examforge_gemini_key';
const AI_PROVIDER_STORAGE = 'examforge_ai_provider';

export default function Home() {
  const [view, setView] = useState<AppView>('config');
  const [apiKey, setApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState<'openrouter' | 'gemini'>('openrouter');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentConfig, setCurrentConfig] = useState<TestConfig | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [similarityReport, setSimilarityReport] = useState<SimilarityReport | null>(null);
  
  // Section state
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Active section data
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  const [pastedNotes, setPastedNotes] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  
  // Retake tracking - when retaking, we update the existing test instead of creating new
  const [retakingTestId, setRetakingTestId] = useState<string | null>(null);
  
  // AI message when unique questions are exhausted
  const [aiUniqueMessage, setAiUniqueMessage] = useState<string | null>(null);
  
  // Data loading state
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Supabase connection status
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'disconnected' | 'checking' | 'tables_missing'>('checking');
  
  // Tables missing message
  const [tablesMissingError, setTablesMissingError] = useState<string | null>(null);

  // Load app data on mount - initialize from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      setSupabaseStatus('checking');
      setTablesMissingError(null);
      
      try {
        // First try to load from Supabase
        const data = await initializeFromSupabase();
        
        // Handle tables missing case
        if (data.tablesMissing) {
          setSupabaseStatus('tables_missing');
          setTablesMissingError('Database tables not found. Please run the SQL setup script in Supabase.');
          toast.error('Supabase tables missing - Run SQL setup script', { duration: 10000 });
        } else {
          // Set connection status
          setSupabaseStatus(data.supabaseConnected ? 'connected' : 'disconnected');
        }
        
        // Load API key from local storage (or from Supabase data)
        if (data.apiKey) {
          setApiKey(data.apiKey);
          localStorage.setItem(API_KEY_STORAGE, data.apiKey);
        } else {
          const storedKey = localStorage.getItem(API_KEY_STORAGE);
          if (storedKey) {
            setApiKey(storedKey);
          }
        }

        // Load Gemini API key from Supabase or localStorage fallback
        if ((data as any).geminiApiKey) {
          setGeminiApiKey((data as any).geminiApiKey);
          localStorage.setItem(GEMINI_KEY_STORAGE, (data as any).geminiApiKey);
        } else {
          const storedGeminiKey = localStorage.getItem(GEMINI_KEY_STORAGE);
          if (storedGeminiKey) setGeminiApiKey(storedGeminiKey);
        }
        
        // Load sections (even if Supabase is not connected, we have localStorage fallback)
        const localData = getAppData();
        const sectionsToUse = data.sections.length > 0 ? data.sections : localData.sections;
        
        if (sectionsToUse.length === 0) {
          // Create a default section if none exist
          const defaultSection = await createSection('General');
          setSections([defaultSection]);
          setActiveSectionId(defaultSection.id);
        } else {
          setSections(sectionsToUse);
          setActiveSectionId(data.activeSectionId || localData.activeSectionId || sectionsToUse[0].id);
        }

        // Provider from Supabase first, then localStorage fallback
        if ((data as any).aiProvider) {
          setAiProvider((data as any).aiProvider);
          localStorage.setItem(AI_PROVIDER_STORAGE, (data as any).aiProvider);
        } else {
          const storedProvider = localStorage.getItem(AI_PROVIDER_STORAGE) as any;
          if (storedProvider === 'gemini' || storedProvider === 'openrouter') setAiProvider(storedProvider);
        }
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
        setSupabaseStatus('disconnected');
        
        // Fallback to localStorage
        const data = getAppData();
        const storedKey = localStorage.getItem(API_KEY_STORAGE);
        if (storedKey) {
          setApiKey(storedKey);
        }
        
        if (data.sections.length === 0) {
          const defaultSection = await createSection('General');
          setSections([defaultSection]);
          setActiveSectionId(defaultSection.id);
        } else {
          setSections(data.sections);
          setActiveSectionId(data.activeSectionId || data.sections[0].id);
        }
      } finally {
        setIsDataLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Load active section data when section changes
  useEffect(() => {
    if (activeSectionId) {
      const section = getSection(activeSectionId);
      if (section) {
        // Deduplicate documents by ID to prevent React key warnings
        const uniqueDocs = new Map();
        section.savedDocuments.forEach(doc => {
          if (!uniqueDocs.has(doc.id)) {
            uniqueDocs.set(doc.id, doc);
          }
        });
        setSavedDocuments(Array.from(uniqueDocs.values()));
        setPastedNotes(section.pastedNotes || '');
        setSelectedDocIds([]);
      }
    }
  }, [activeSectionId]);

  // Get active section
  const activeSection = activeSectionId ? getSection(activeSectionId) : null;

  // Save API key to storage when changed
  const handleApiKeyChange = async (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
    await saveAppData({ apiKey: key });
  };

  const handleGeminiApiKeyChange = async (key: string) => {
    setGeminiApiKey(key);
    if (key) {
      localStorage.setItem(GEMINI_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
    await saveAppData({ geminiApiKey: key } as any);
  };

  const handleAiProviderChange = async (provider: 'openrouter' | 'gemini') => {
    setAiProvider(provider);
    localStorage.setItem(AI_PROVIDER_STORAGE, provider);
    await saveAppData({ aiProvider: provider } as any);
  };

  // Section management handlers
  const handleCreateSection = async (name: string) => {
    const newSection = await createSection(name);
    setSections(getAllSections());
    setActiveSectionId(newSection.id);
    toast.success(`Created section "${name}"`);
  };

  const handleSelectSection = async (sectionId: string) => {
    await setActiveSection(sectionId);
    setActiveSectionId(sectionId);
    setView('config');
    setMobileSidebarOpen(false);
    // Reset quiz state when switching sections
    setQuestions([]);
    setAnswers({});
    setCurrentConfig(null);
    setSimilarityReport(null);
  };

  const handleRenameSection = async (sectionId: string, newName: string) => {
    await renameSection(sectionId, newName);
    setSections(getAllSections());
    toast.success(`Renamed section to "${newName}"`);
  };

  const handleDeleteSection = async (sectionId: string) => {
    const sectionName = getSection(sectionId)?.name;
    await deleteSection(sectionId);
    const updatedSections = getAllSections();
    setSections(updatedSections);
    
    if (updatedSections.length === 0) {
      // Create a new default section if all deleted
      const defaultSection = await createSection('General');
      setSections([defaultSection]);
      setActiveSectionId(defaultSection.id);
    } else if (sectionId === activeSectionId) {
      // Switch to first available section
      setActiveSectionId(updatedSections[0].id);
    }
    
    toast.success(`Deleted section "${sectionName}"`);
  };

  // Document management handlers
  const handleSaveDocument = async (doc: { name: string; content: string; size: number }) => {
    if (!activeSectionId) return;
    
    const savedDoc = await addDocumentToSection(activeSectionId, doc);
    setSavedDocuments(prev => [...prev, savedDoc]);
    toast.success(`Saved "${doc.name}" to section`);
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!activeSectionId) return;
    
    await removeDocumentFromSection(activeSectionId, docId);
    setSavedDocuments(prev => prev.filter(d => d.id !== docId));
    setSelectedDocIds(prev => prev.filter(id => id !== docId));
    toast.success('Document removed');
  };

  const handleSelectDocuments = (docs: SavedDocument[]) => {
    setSelectedDocIds(docs.map(d => d.id));
  };

  // Notes persistence with debounce
  const handleNotesChange = useCallback((notes: string) => {
    setPastedNotes(notes);
    if (activeSectionId) {
      updateSectionNotes(activeSectionId, notes);
    }
  }, [activeSectionId]);

  // Test generation
  const handleStartTest = async (config: TestConfig) => {
    if (!activeSectionId || !activeSection) return;
    
    setIsLoading(true);
    
    // Enhance config with section context
    const enhancedConfig: TestConfig = {
      ...config,
      sectionId: activeSectionId,
      sectionName: activeSection.name,
    };
    setCurrentConfig(enhancedConfig);

    try {
      const storedQuestions = activeSection.storedQuestions;
      
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: enhancedConfig,
          provider: aiProvider,
          apiKey,
          geminiApiKey,
          storedQuestions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Debug logs for currently selected provider/key
        if (aiProvider === 'gemini') {
          logError('Gemini api key error', { error: data.error }, 'generate-test');
        } else {
          logError('Api key error', { error: data.error }, 'generate-test');
        }
        throw new Error(data.error || 'Failed to generate test');
      }

      // Provider health log (requested)
      if (aiProvider === 'gemini') {
        logSuccess('Gemini api key currunty working succefully', null, 'generate-test');
      } else {
        logSuccess('Openrouter api key currunty working succefully', null, 'generate-test');
      }

      // Generate similarity report for this section
      const questionTexts = data.questions.map((q: Question) => q.question);
      const report = generateSimilarityReportForSection(activeSectionId, questionTexts);
      setSimilarityReport(report);

      setQuestions(data.questions);
      setAnswers({});
      
      // Store AI message if fewer questions were generated
      if (data.message) {
        setAiUniqueMessage(data.message);
      } else {
        setAiUniqueMessage(null);
      }
      
      // Show similarity report first if there are stored questions
      if (storedQuestions.length > 0) {
        setView('similarity');
      } else {
        setView('quiz');
      }
      
      // Show appropriate toast
      if (data.message) {
        toast.warning(`Generated ${data.questions.length} questions. ${data.message}`);
      } else {
        toast.success(`Generated ${data.questions.length} questions!`);
      }
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

  const handleQuizComplete = async (userAnswers: Record<string, number>, time: number) => {
    if (!activeSectionId || !currentConfig) return;
    
    setAnswers(userAnswers);
    setTimeTaken(time);
    
    // Calculate score
    const correctCount = questions.filter(
      (q) => userAnswers[q.id] === q.correctAnswer
    ).length;

    // If retaking, update existing test; otherwise create new
    if (retakingTestId) {
      // Update existing test with new attempt data
      const section = getSection(activeSectionId);
      const existingTest = section?.testResults.find(t => t.id === retakingTestId);
      
      if (existingTest) {
        const updatedResult: TestResult = {
          ...existingTest,
          date: new Date().toISOString(),
          answers: userAnswers,
          score: correctCount,
          timeTaken: time,
        };
        
        // Update in section store
        await updateTestResultInSection(activeSectionId, retakingTestId, updatedResult);
      }
      
      // Clear retake state
      setRetakingTestId(null);
    } else {
      // Create new test result
      const result: TestResult = {
        id: `test-${Date.now()}`,
        name: `Test - ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        config: currentConfig,
        questions,
        answers: userAnswers,
        score: correctCount,
        totalQuestions: questions.length,
        timeTaken: time,
      };
      
      await saveTestResultToSection(activeSectionId, result);
    }
    
    // Refresh sections to get updated data
    setSections(getAllSections());
    
    setView('results');
    toast.success('Test completed and saved!');
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
    setAiUniqueMessage(null);
    setView('config');
  };

  const handleShowHistory = () => {
    setView('history');
  };

  const handleCloseHistory = () => {
    setView('config');
  };

  // History management handlers
  const handleRenameTest = async (testId: string, newName: string) => {
    if (!activeSectionId) return;
    await renameTestResult(activeSectionId, testId, newName);
    setSections(getAllSections());
    toast.success('Test renamed');
  };

  const handleDeleteTest = async (testId: string) => {
    if (!activeSectionId) return;
    await deleteTestResult(activeSectionId, testId);
    setSections(getAllSections());
    toast.success('Test deleted');
  };

  const handleRetakeTest = (test: TestResult) => {
    setQuestions(test.questions);
    setAnswers({});
    setCurrentConfig(test.config);
    setRetakingTestId(test.id); // Track which test is being retaken
    setView('quiz');
    toast.info('Starting retake - results will update the same test');
  };

  const handleClearAllHistory = async () => {
    if (!activeSectionId) return;
    await clearSectionData(activeSectionId);
    setSections(getAllSections());
    setSavedDocuments([]);
    setSelectedDocIds([]);
    toast.success('Section data cleared');
  };

  // Get section stats
  const sectionStats = activeSectionId ? getSectionStats(activeSectionId) : null;

  // Show loading state while data is being fetched
  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sections Drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Sections</SheetTitle>
          <SectionSidebar
            sections={sections}
            activeSectionId={activeSectionId}
            onSelectSection={handleSelectSection}
            onCreateSection={handleCreateSection}
            onRenameSection={handleRenameSection}
            onDeleteSection={handleDeleteSection}
            isCollapsed={false}
            onToggleCollapse={() => {}}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Section Sidebar */}
      <div className="hidden md:flex">
        <SectionSidebar
          sections={sections}
          activeSectionId={activeSectionId}
          onSelectSection={handleSelectSection}
          onCreateSection={handleCreateSection}
          onRenameSection={handleRenameSection}
          onDeleteSection={handleDeleteSection}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          geminiApiKey={geminiApiKey}
          onGeminiApiKeyChange={handleGeminiApiKeyChange}
          aiProvider={aiProvider}
          onAiProviderChange={handleAiProviderChange}
          onShowHistory={handleShowHistory}
          sectionName={activeSection?.name}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
          {view === 'config' && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                  {activeSection?.name || 'AI-Powered Test Generator'}
                </h2>
                <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
                  Transform your study notes into unique practice tests. Each section maintains its own memory for intelligent question tracking.
                </p>
              </div>
              
              {/* Section Stats */}
              {sectionStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{sectionStats.totalTests}</p>
                    <p className="text-sm text-muted-foreground">Tests Taken</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{sectionStats.averageScore}%</p>
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{sectionStats.questionsStored}</p>
                    <p className="text-sm text-muted-foreground">Questions Tracked</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{sectionStats.documentsCount}</p>
                    <p className="text-sm text-muted-foreground">Saved Docs</p>
                  </div>
                </div>
              )}
              
              <TestConfigForm
                onStartTest={handleStartTest}
                isLoading={isLoading}
                hasApiKey={!!apiKey}
                savedDocuments={savedDocuments}
                selectedDocIds={selectedDocIds}
                onSaveDocument={handleSaveDocument}
                onRemoveDocument={handleRemoveDocument}
                onSelectDocuments={handleSelectDocuments}
                pastedNotes={pastedNotes}
                onNotesChange={handleNotesChange}
                sectionName={activeSection?.name || 'Section'}
              />
            </div>
          )}

          {view === 'similarity' && similarityReport && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Test Generated Successfully</h2>
                <p className="text-muted-foreground">
                  Review the uniqueness report for {activeSection?.name} before starting your test
                </p>
              </div>
              
              {/* AI Uniqueness Message */}
              {aiUniqueMessage && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-amber-600 text-sm">!</span>
                    </div>
                    <div>
                      <p className="font-medium text-amber-600 mb-1">Uniqueness Notice</p>
                      <p className="text-sm text-amber-600/80">{aiUniqueMessage}</p>
                    </div>
                  </div>
                </div>
              )}
              
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
              uniquenessMessage={aiUniqueMessage}
            />
          )}

          {view === 'history' && activeSection && sectionStats && (
            <SectionHistory
              testResults={activeSection.testResults}
              sectionName={activeSection.name}
              questionsStored={sectionStats.questionsStored}
              documentsCount={sectionStats.documentsCount}
              onRenameTest={handleRenameTest}
              onDeleteTest={handleDeleteTest}
              onRetakeTest={handleRetakeTest}
              onClearAll={handleClearAllHistory}
              onBack={handleCloseHistory}
            />
          )}
        </main>
      </div>

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

      {/* Supabase Connection Status Indicator */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Tables Missing Warning */}
        {supabaseStatus === 'tables_missing' && tablesMissingError && (
          <div className="bg-orange-500/90 text-white px-4 py-2 rounded-lg shadow-lg text-xs max-w-xs">
            <div className="font-semibold mb-1">⚠️ Database Setup Required</div>
            <div className="opacity-90">{tablesMissingError}</div>
            <a 
              href="https://supabase.com/dashboard/project/bczfxxlnhhwrbsnspeat/sql-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 underline hover:no-underline font-medium"
            >
              Open Supabase SQL Editor →
            </a>
          </div>
        )}
        
        <div 
          className={`
            flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border backdrop-blur-sm
            transition-all duration-300 cursor-default
            ${supabaseStatus === 'connected' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
              : supabaseStatus === 'checking'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
              : supabaseStatus === 'tables_missing'
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-600'
              : 'bg-red-500/10 border-red-500/30 text-red-600'
            }
          `}
          title={
            supabaseStatus === 'connected' 
              ? 'Supabase Connected - Your data is syncing to cloud' 
              : supabaseStatus === 'checking'
              ? 'Checking Supabase connection...'
              : supabaseStatus === 'tables_missing'
              ? 'Database tables missing - Run SQL setup script'
              : 'Supabase Disconnected - Data saved locally only'
          }
        >
          {/* Status Dot */}
          <span 
            className={`
              w-2.5 h-2.5 rounded-full
              ${supabaseStatus === 'connected' 
                ? 'bg-emerald-500 animate-pulse' 
                : supabaseStatus === 'checking'
                ? 'bg-amber-500 animate-pulse'
                : supabaseStatus === 'tables_missing'
                ? 'bg-orange-500 animate-pulse'
                : 'bg-red-500'
              }
            `}
          />
          
          {/* Status Text */}
          <span className="text-xs font-medium">
            {supabaseStatus === 'connected' 
              ? 'Cloud Sync Active' 
              : supabaseStatus === 'checking'
              ? 'Connecting...'
              : supabaseStatus === 'tables_missing'
              ? 'Setup Required'
              : 'Offline Mode'
            }
          </span>
          
          {/* Database Icon */}
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" 
            />
          </svg>
        </div>
      </div>
      
      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
}
