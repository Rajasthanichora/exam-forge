export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'english' | 'hindi' | 'hinglish';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty: Difficulty;
  topic?: string;
}

export interface TestConfig {
  studyNotes: string;
  difficulty: Difficulty;
  questionCount: number;
  language: Language;
  customPrompt: string;
  aiModel?: string;
  sectionId?: string;
  sectionName?: string;
}

export interface TestResult {
  id: string;
  name: string;
  date: string;
  config: TestConfig;
  questions: Question[];
  answers: Record<string, number>;
  score: number;
  totalQuestions: number;
  timeTaken?: number;
}

export interface StoredQuestion {
  questionHash: string;
  questionText: string;
  topic?: string;
  dateUsed: string;
  testId?: string;
}

export interface SavedDocument {
  id: string;
  name: string;
  content: string;
  size: number;
  uploadedAt: string;
}

export interface Section {
  id: string;
  name: string;
  createdAt: string;
  savedDocuments: SavedDocument[];
  storedQuestions: StoredQuestion[];
  testResults: TestResult[];
  pastedNotes?: string;
}

export interface AppData {
  sections: Section[];
  apiKey: string;
  geminiApiKey: string;
  aiProvider: 'openrouter' | 'gemini';
  activeSectionId: string | null;
}

export interface SimilarityReport {
  totalNewQuestions: number;
  similarQuestions: number;
  uniqueQuestions: number;
  similarityPercentage: number;
  flaggedQuestions: Array<{
    newQuestion: string;
    similarTo: string;
    similarity: number;
  }>;
}

export interface UploadedFile {
  name: string;
  content: string;
  size: number;
}
