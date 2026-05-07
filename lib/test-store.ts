import { TestHistory, TestResult, StoredQuestion, SimilarityReport } from './types';

const STORAGE_KEY = 'examforge_test_history';

export function getTestHistory(): TestHistory {
  if (typeof window === 'undefined') {
    return { results: [], storedQuestions: [] };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration from old format
      if (parsed.usedQuestionHashes && !parsed.storedQuestions) {
        return { results: parsed.results || [], storedQuestions: [] };
      }
      return parsed;
    }
  } catch (error) {
    console.error('Error reading test history:', error);
  }
  
  return { results: [], storedQuestions: [] };
}

export function saveTestResult(result: TestResult): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getTestHistory();
    
    // Add new result
    history.results.unshift(result);
    
    // Keep only last 50 results
    if (history.results.length > 50) {
      history.results = history.results.slice(0, 50);
    }
    
    // Store questions with full details for better similarity matching
    const newStoredQuestions: StoredQuestion[] = result.questions.map(q => ({
      questionHash: hashQuestion(q.question),
      questionText: q.question,
      topic: q.topic,
      dateUsed: result.date,
    }));
    
    history.storedQuestions = [...newStoredQuestions, ...history.storedQuestions];
    
    // Keep only last 1000 questions
    if (history.storedQuestions.length > 1000) {
      history.storedQuestions = history.storedQuestions.slice(0, 1000);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving test result:', error);
  }
}

export function getStoredQuestions(): StoredQuestion[] {
  const history = getTestHistory();
  return history.storedQuestions;
}

export function clearTestHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function hashQuestion(question: string): string {
  // Improved hash function for question deduplication
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

// Calculate similarity between two strings using Jaccard similarity
export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' '));
  const words2 = new Set(normalizeText(text2).split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Check if a question is similar to any stored question
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

// Generate similarity report for a set of questions
export function generateSimilarityReport(
  newQuestions: string[],
  threshold: number = 0.6
): SimilarityReport {
  const storedQuestions = getStoredQuestions();
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
    similarityPercentage: Math.round((flaggedQuestions.length / newQuestions.length) * 100),
    flaggedQuestions,
  };
}

export function getRecentTopics(): string[] {
  const history = getTestHistory();
  const topics = history.storedQuestions
    .slice(0, 100)
    .map(q => q.topic)
    .filter(Boolean) as string[];
  return [...new Set(topics)];
}

export function getAverageScore(): number {
  const history = getTestHistory();
  if (history.results.length === 0) return 0;
  
  const totalScore = history.results.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0);
  return Math.round(totalScore / history.results.length);
}

export function getTotalTestsTaken(): number {
  return getTestHistory().results.length;
}

export function getTotalQuestionsStored(): number {
  return getTestHistory().storedQuestions.length;
}
