import { AppData, Section, SavedDocument, StoredQuestion, TestResult, SimilarityReport } from './types';

const STORAGE_KEY = 'examforge_app_data';
const API_KEY_STORAGE = 'examforge_openrouter_key';

// Initialize default app data
function getDefaultAppData(): AppData {
  return {
    sections: [],
    apiKey: '',
    activeSectionId: null,
  };
}

// Get all app data
export function getAppData(): AppData {
  if (typeof window === 'undefined') {
    return getDefaultAppData();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const apiKey = localStorage.getItem(API_KEY_STORAGE) || '';
    
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed, apiKey };
    }
  } catch (error) {
    console.error('Error reading app data:', error);
  }

  return getDefaultAppData();
}

// Save app data (excluding API key which is stored separately)
export function saveAppData(data: Partial<AppData>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getAppData();
    const updated = { ...current, ...data };
    
    // Store API key separately for security
    if (data.apiKey !== undefined) {
      localStorage.setItem(API_KEY_STORAGE, data.apiKey);
    }
    
    // Remove apiKey from main storage
    const { apiKey, ...rest } = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch (error) {
    console.error('Error saving app data:', error);
  }
}

// Section management
export function createSection(name: string): Section {
  const section: Section = {
    id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    createdAt: new Date().toISOString(),
    savedDocuments: [],
    storedQuestions: [],
    testResults: [],
  };

  const data = getAppData();
  data.sections.push(section);
  data.activeSectionId = section.id;
  saveAppData(data);

  return section;
}

export function getSection(sectionId: string): Section | undefined {
  const data = getAppData();
  return data.sections.find(s => s.id === sectionId);
}

export function getAllSections(): Section[] {
  return getAppData().sections;
}

export function updateSection(sectionId: string, updates: Partial<Section>): void {
  const data = getAppData();
  const index = data.sections.findIndex(s => s.id === sectionId);
  
  if (index !== -1) {
    data.sections[index] = { ...data.sections[index], ...updates };
    saveAppData(data);
  }
}

export function renameSection(sectionId: string, newName: string): void {
  updateSection(sectionId, { name: newName });
}

export function deleteSection(sectionId: string): void {
  const data = getAppData();
  data.sections = data.sections.filter(s => s.id !== sectionId);
  
  // If active section was deleted, set to first available or null
  if (data.activeSectionId === sectionId) {
    data.activeSectionId = data.sections.length > 0 ? data.sections[0].id : null;
  }
  
  saveAppData(data);
}

export function setActiveSection(sectionId: string): void {
  saveAppData({ activeSectionId: sectionId });
}

// Document management within sections
export function addDocumentToSection(sectionId: string, doc: Omit<SavedDocument, 'id' | 'uploadedAt'>): SavedDocument {
  const section = getSection(sectionId);
  if (!section) throw new Error('Section not found');

  const savedDoc: SavedDocument = {
    ...doc,
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    uploadedAt: new Date().toISOString(),
  };

  section.savedDocuments.push(savedDoc);
  updateSection(sectionId, { savedDocuments: section.savedDocuments });

  return savedDoc;
}

export function removeDocumentFromSection(sectionId: string, docId: string): void {
  const section = getSection(sectionId);
  if (!section) return;

  section.savedDocuments = section.savedDocuments.filter(d => d.id !== docId);
  updateSection(sectionId, { savedDocuments: section.savedDocuments });
}

export function updateSectionNotes(sectionId: string, notes: string): void {
  updateSection(sectionId, { pastedNotes: notes });
}

// Test result management within sections
export function saveTestResultToSection(sectionId: string, result: TestResult): void {
  const section = getSection(sectionId);
  if (!section) return;

  // Add result
  section.testResults.unshift(result);
  
  // Keep only last 50 results per section
  if (section.testResults.length > 50) {
    section.testResults = section.testResults.slice(0, 50);
  }

  // Store questions for deduplication
  const newStoredQuestions: StoredQuestion[] = result.questions.map(q => ({
    questionHash: hashQuestion(q.question),
    questionText: q.question,
    topic: q.topic,
    dateUsed: result.date,
  }));

  section.storedQuestions = [...newStoredQuestions, ...section.storedQuestions];
  
  // Keep only last 500 questions per section
  if (section.storedQuestions.length > 500) {
    section.storedQuestions = section.storedQuestions.slice(0, 500);
  }

  updateSection(sectionId, { 
    testResults: section.testResults,
    storedQuestions: section.storedQuestions,
  });
}

// Update a test result in place (for retakes)
export function updateTestResultInSection(sectionId: string, testId: string, updatedResult: TestResult): void {
  const section = getSection(sectionId);
  if (!section) return;

  const testIndex = section.testResults.findIndex(t => t.id === testId);
  if (testIndex !== -1) {
    section.testResults[testIndex] = updatedResult;
    updateSection(sectionId, { testResults: section.testResults });
  }
}

export function renameTestResult(sectionId: string, testId: string, newName: string): void {
  const section = getSection(sectionId);
  if (!section) return;

  const testIndex = section.testResults.findIndex(t => t.id === testId);
  if (testIndex !== -1) {
    section.testResults[testIndex].name = newName;
    updateSection(sectionId, { testResults: section.testResults });
  }
}

export function deleteTestResult(sectionId: string, testId: string): void {
  const section = getSection(sectionId);
  if (!section) return;

  section.testResults = section.testResults.filter(t => t.id !== testId);
  updateSection(sectionId, { testResults: section.testResults });
}

// Utility functions
export function hashQuestion(question: string): string {
  let hash = 0;
  const str = normalizeText(question);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' '));
  const words2 = new Set(normalizeText(text2).split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export function checkQuestionSimilarity(
  newQuestion: string,
  storedQuestions: StoredQuestion[],
  threshold: number = 0.6
): { isSimilar: boolean; similarity: number; similarTo?: string } {
  let maxSimilarity = 0;
  let mostSimilar: string | undefined;
  
  for (const stored of storedQuestions) {
    const similarity = calculateSimilarity(newQuestion, stored.questionText);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilar = stored.questionText;
    }
  }
  
  return {
    isSimilar: maxSimilarity >= threshold,
    similarity: maxSimilarity,
    similarTo: mostSimilar,
  };
}

export function generateSimilarityReportForSection(
  sectionId: string,
  newQuestions: string[],
  threshold: number = 0.6
): SimilarityReport {
  const section = getSection(sectionId);
  const storedQuestions = section?.storedQuestions || [];
  const flaggedQuestions: SimilarityReport['flaggedQuestions'] = [];
  
  for (const question of newQuestions) {
    const result = checkQuestionSimilarity(question, storedQuestions, threshold);
    if (result.isSimilar && result.similarTo) {
      flaggedQuestions.push({
        newQuestion: question,
        similarTo: result.similarTo,
        similarity: result.similarity,
      });
    }
  }
  
  return {
    totalNewQuestions: newQuestions.length,
    similarQuestions: flaggedQuestions.length,
    uniqueQuestions: newQuestions.length - flaggedQuestions.length,
    similarityPercentage: newQuestions.length > 0 
      ? Math.round((flaggedQuestions.length / newQuestions.length) * 100) 
      : 0,
    flaggedQuestions,
  };
}

// Stats for a section
export function getSectionStats(sectionId: string) {
  const section = getSection(sectionId);
  if (!section) {
    return { totalTests: 0, averageScore: 0, questionsStored: 0, documentsCount: 0 };
  }

  const totalTests = section.testResults.length;
  const averageScore = totalTests > 0 
    ? Math.round(section.testResults.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0) / totalTests)
    : 0;

  return {
    totalTests,
    averageScore,
    questionsStored: section.storedQuestions.length,
    documentsCount: section.savedDocuments.length,
  };
}

// Global stats
export function getGlobalStats() {
  const data = getAppData();
  
  let totalTests = 0;
  let totalScore = 0;
  let totalQuestions = 0;
  let totalDocuments = 0;

  for (const section of data.sections) {
    totalTests += section.testResults.length;
    totalDocuments += section.savedDocuments.length;
    totalQuestions += section.storedQuestions.length;
    
    for (const result of section.testResults) {
      totalScore += (result.score / result.totalQuestions) * 100;
    }
  }

  return {
    totalSections: data.sections.length,
    totalTests,
    averageScore: totalTests > 0 ? Math.round(totalScore / totalTests) : 0,
    totalQuestions,
    totalDocuments,
  };
}

// Clear all data for a section
export function clearSectionData(sectionId: string): void {
  const section = getSection(sectionId);
  if (!section) return;

  updateSection(sectionId, {
    savedDocuments: [],
    storedQuestions: [],
    testResults: [],
    pastedNotes: '',
  });
}
