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
} from '@/lib/section-store';
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
  
  // Section state
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Active section data
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  const [pastedNotes, setPastedNotes] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  
  // Retake tracking - when retaking, we update the existing test instead of creating new
  const [retakingTestId, setRetakingTestId] = useState<string | null>(null);

  // Load app data on mount
  useEffect(() => {
    const data = getAppData();
    
    // Load API key
    const storedKey = localStorage.getItem(API_KEY_STORAGE);
    if (storedKey) {
      setApiKey(storedKey);
    }
    
    // Load sections
    if (data.sections.length === 0) {
      // Create a default section if none exist
      const defaultSection = createSection('General');
      setSections([defaultSection]);
      setActiveSectionId(defaultSection.id);
    } else {
      setSections(data.sections);
      setActiveSectionId(data.activeSectionId || data.sections[0].id);
    }
  }, []);

  // Load active section data when section changes
  useEffect(() => {
    if (activeSectionId) {
      const section = getSection(activeSectionId);
      if (section) {
        setSavedDocuments(section.savedDocuments);
        setPastedNotes(section.pastedNotes || '');
        setSelectedDocIds([]);
      }
    }
  }, [activeSectionId]);

  // Get active section
  const activeSection = activeSectionId ? getSection(activeSectionId) : null;

  // Save API key to storage when changed
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE, key);
  };

  // Section management handlers
  const handleCreateSection = (name: string) => {
    const newSection = createSection(name);
    setSections(getAllSections());
    setActiveSectionId(newSection.id);
    toast.success(`Created section "${name}"`);
  };

  const handleSelectSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setActiveSectionId(sectionId);
    setView('config');
    // Reset quiz state when switching sections
    setQuestions([]);
    setAnswers({});
    setCurrentConfig(null);
    setSimilarityReport(null);
  };

  const handleRenameSection = (sectionId: string, newName: string) => {
    renameSection(sectionId, newName);
    setSections(getAllSections());
    toast.success(`Renamed section to "${newName}"`);
  };

  const handleDeleteSection = (sectionId: string) => {
    const sectionName = getSection(sectionId)?.name;
    deleteSection(sectionId);
    const updatedSections = getAllSections();
    setSections(updatedSections);
    
    if (updatedSections.length === 0) {
      // Create a new default section if all deleted
      const defaultSection = createSection('General');
      setSections([defaultSection]);
      setActiveSectionId(defaultSection.id);
    } else if (sectionId === activeSectionId) {
      // Switch to first available section
      setActiveSectionId(updatedSections[0].id);
    }
    
    toast.success(`Deleted section "${sectionName}"`);
  };

  // Document management handlers
  const handleSaveDocument = (doc: { name: string; content: string; size: number }) => {
    if (!activeSectionId) return;
    
    const savedDoc = addDocumentToSection(activeSectionId, doc);
    setSavedDocuments(prev => [...prev, savedDoc]);
    toast.success(`Saved "${doc.name}" to section`);
  };

  const handleRemoveDocument = (docId: string) => {
    if (!activeSectionId) return;
    
    removeDocumentFromSection(activeSectionId, docId);
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
          apiKey,
          storedQuestions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate test');
      }

      // Generate similarity report for this section
      const questionTexts = data.questions.map((q: Question) => q.question);
      const report = generateSimilarityReportForSection(activeSectionId, questionTexts);
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
        updateTestResultInSection(activeSectionId, retakingTestId, updatedResult);
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
      
      saveTestResultToSection(activeSectionId, result);
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
    setView('config');
  };

  const handleShowHistory = () => {
    setView('history');
  };

  const handleCloseHistory = () => {
    setView('config');
  };

  // History management handlers
  const handleRenameTest = (testId: string, newName: string) => {
    if (!activeSectionId) return;
    renameTestResult(activeSectionId, testId, newName);
    setSections(getAllSections());
    toast.success('Test renamed');
  };

  const handleDeleteTest = (testId: string) => {
    if (!activeSectionId) return;
    deleteTestResult(activeSectionId, testId);
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

  const handleClearAllHistory = () => {
    if (!activeSectionId) return;
    clearSectionData(activeSectionId);
    setSections(getAllSections());
    setSavedDocuments([]);
    setSelectedDocIds([]);
    toast.success('Section data cleared');
  };

  // Get section stats
  const sectionStats = activeSectionId ? getSectionStats(activeSectionId) : null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Section Sidebar */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          onShowHistory={handleShowHistory}
          sectionName={activeSection?.name}
        />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          {view === 'config' && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold text-foreground text-balance">
                  {activeSection?.name || 'AI-Powered Test Generator'}
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
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
    </div>
  );
}
