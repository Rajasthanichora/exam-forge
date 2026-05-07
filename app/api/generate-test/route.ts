import { NextRequest, NextResponse } from 'next/server';
import { Question, TestConfig, Difficulty, StoredQuestion } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, apiKey, storedQuestions } = body as {
      config: TestConfig;
      apiKey: string;
      storedQuestions: StoredQuestion[];
    };

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key is required' },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(config, storedQuestions);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://examforge.ai',
        'X-Title': 'ExamForge AI',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(config.language)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.85,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to generate questions. Please check your API key.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let questions: Question[];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(content);
      }
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse generated questions. Please try again.' },
        { status: 500 }
      );
    }

    // Validate and format questions
    const validatedQuestions = questions
      .slice(0, config.questionCount)
      .map((q: Record<string, unknown>, index: number) => ({
        id: `q-${Date.now()}-${index}`,
        question: String(q.question || ''),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: String(q.explanation || ''),
        difficulty: config.difficulty,
        topic: String(q.topic || 'General'),
      }))
      .filter((q: Question) => q.question && q.options.length === 4);

    if (validatedQuestions.length === 0) {
      return NextResponse.json(
        { error: 'No valid questions were generated. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions: validatedQuestions });
  } catch (error) {
    console.error('Error generating test:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

function getSystemPrompt(language: string): string {
  const languageInstructions: Record<string, string> = {
    english: 'Generate all questions, options, and explanations in English only.',
    hindi: 'Generate all questions, options, and explanations in Hindi (हिंदी) using Devanagari script.',
    hinglish: 'Generate questions in Hinglish - a natural mix of Hindi and English as commonly used in conversation. Use Roman script with Hindi words mixed in naturally.',
  };

  return `You are an expert exam question generator specializing in creating unique, non-repetitive multiple-choice questions.

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON array, no markdown or extra text
- Each question must have exactly 4 options
- The correctAnswer field must be the index (0-3) of the correct option
- Include a brief, educational explanation for each answer
- Questions must be UNIQUE and avoid any similarity to previously used questions
- Extract key concepts from the study material and create diverse question types

LANGUAGE: ${languageInstructions[language] || languageInstructions.english}

QUESTION DIVERSITY RULES:
1. Vary question types: factual recall, application, analysis, comparison
2. Cover different aspects of each topic
3. Use different question formats: direct questions, fill-in-blanks, scenario-based
4. Avoid repeating similar phrasing or patterns
5. If the study material covers multiple topics, distribute questions across all topics`;
}

function buildPrompt(config: TestConfig, storedQuestions: StoredQuestion[]): string {
  const difficultyInstructions: Record<Difficulty, string> = {
    easy: 'Create straightforward questions testing basic recall and understanding. Questions should be clear with distinct correct answers.',
    medium: 'Create moderately challenging questions requiring application of concepts. Include questions that require reasoning and connecting ideas.',
    hard: 'Create challenging questions requiring analysis, synthesis, and critical thinking. Include nuanced options that test deep understanding.',
  };

  let prompt = `Generate ${config.questionCount} UNIQUE multiple-choice questions based on the study material provided.

DIFFICULTY LEVEL: ${config.difficulty.toUpperCase()}
${difficultyInstructions[config.difficulty]}

`;

  if (config.customPrompt) {
    prompt += `SPECIAL INSTRUCTIONS: ${config.customPrompt}\n\n`;
  }

  prompt += `STUDY MATERIAL:
${config.studyNotes}

`;

  // Add information about previously used questions to avoid
  if (storedQuestions.length > 0) {
    const recentQuestions = storedQuestions.slice(0, 50);
    prompt += `IMPORTANT - AVOID SIMILAR QUESTIONS TO THESE PREVIOUSLY USED ONES:
${recentQuestions.map((q, i) => `${i + 1}. ${q.questionText.substring(0, 100)}...`).join('\n')}

Generate completely NEW questions that are different from the above list. Focus on different aspects, use different phrasing, and test different knowledge points.

`;
  }

  prompt += `OUTPUT FORMAT - Return a JSON array with this exact structure:
[
  {
    "question": "The complete question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this answer is correct and why others are wrong",
    "topic": "Specific topic/concept this question tests"
  }
]

FINAL CHECKLIST:
- Generate EXACTLY ${config.questionCount} questions
- All 4 options must be plausible but only one correct
- Questions must be clear and unambiguous
- Each question tests a distinct concept or fact
- No repetition of similar questions`;

  return prompt;
}
