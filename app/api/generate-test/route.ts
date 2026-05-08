import { NextRequest, NextResponse } from 'next/server';
import { Question, TestConfig, Difficulty, StoredQuestion } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, provider, model, apiKey, geminiApiKey, storedQuestions } = body as {
      config: TestConfig;
      provider?: 'openrouter' | 'gemini';
      model?: string;
      apiKey: string;
      geminiApiKey?: string;
      storedQuestions: StoredQuestion[];
    };

    const selectedProvider: 'openrouter' | 'gemini' = provider === 'gemini' ? 'gemini' : 'openrouter';
    const selectedModel =
      model?.trim() ||
      (selectedProvider === 'gemini' ? 'gemini-2.0-flash' : 'meta-llama/llama-3.3-70b-instruct:free');

    const prompt = buildPrompt(config, storedQuestions);

    let response: Response;
    if (selectedProvider === 'gemini') {
      if (!geminiApiKey) {
        return NextResponse.json(
          { error: 'Gemini API key is required' },
          { status: 400 }
        );
      }

      // Gemini API (Generative Language API)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${getSystemPrompt(config.language)}\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 6000,
          }
        }),
      });
    } else {
      if (!apiKey) {
        return NextResponse.json(
          { error: 'OpenRouter API key is required' },
          { status: 400 }
        );
      }

      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://examforge.ai',
          'X-Title': 'ExamForge AI',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
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
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`${selectedProvider} API error:`, errorData);
      const providerError = getProviderErrorMessage(selectedProvider, errorData);
      return NextResponse.json({ error: providerError }, { status: response.status });
    }

    const data = await response.json();
    const content =
      selectedProvider === 'gemini'
        ? data.candidates?.[0]?.content?.parts?.[0]?.text
        : data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 500 }
      );
    }

    // Parse the JSON response - handle both object and array formats
    let questions: Question[];
    let aiMessage: string | null = null;
    
    try {
      // First try to parse as the new object format { questions: [], message: "" }
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        const parsed = JSON.parse(objectMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          questions = parsed.questions;
          aiMessage = parsed.message || null;
        } else if (Array.isArray(parsed)) {
          questions = parsed;
        } else {
          // Fallback: try to find array in response
          const arrayMatch = content.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            questions = JSON.parse(arrayMatch[0]);
          } else {
            throw new Error('No valid questions array found');
          }
        }
      } else {
        // Try array format directly
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          questions = JSON.parse(arrayMatch[0]);
        } else {
          questions = JSON.parse(content);
        }
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
      .filter((q: Question) => q.question && q.options.length === 4)
      .map(shuffleQuestionOptions);

    if (validatedQuestions.length === 0) {
      return NextResponse.json(
        { error: 'No valid questions were generated. Please try again.' },
        { status: 500 }
      );
    }

    // Return questions with optional AI message about uniqueness
    const result: { questions: Question[]; message?: string } = { 
      questions: validatedQuestions 
    };
    
    // Add message if AI couldn't generate all requested questions
    if (aiMessage) {
      result.message = aiMessage;
    } else if (validatedQuestions.length < config.questionCount) {
      result.message = `Only ${validatedQuestions.length} unique questions could be generated. The study material may have been exhausted for new unique questions.`;
    }

    return NextResponse.json(result);
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

  return `You are an expert exam question generator specializing in creating UNIQUE, non-repetitive multiple-choice questions.

CRITICAL OUTPUT FORMAT:
- Return a JSON object with this structure: { "questions": [...], "message": "..." }
- "questions" is an array of question objects
- "message" is optional - include ONLY if you couldn't generate all requested questions
- Example message: "Only 5 unique questions could be generated. The study material has been exhausted for new unique questions."

QUESTION REQUIREMENTS:
- Each question must have exactly 4 options
- The correctAnswer field must be the index (0-3) of the correct option
- Include a brief, educational explanation for each answer
- Questions must be COMPLETELY UNIQUE - different concepts, different phrasing, different angles

LANGUAGE: ${languageInstructions[language] || languageInstructions.english}

UNIQUENESS IS CRITICAL:
1. Understand the INTENT of previously used questions, not just the exact wording
2. You CAN twist the language, change difficulty level, use different angles
3. But you CANNOT ask about the same fact/concept that was already tested
4. Focus on UNTESTED aspects of the study material
5. If you run out of unique concepts to test, generate FEWER questions rather than repeat
6. Vary question types: factual recall, application, analysis, comparison, scenario-based`;
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

  // Send ALL previously used questions for better deduplication
  if (storedQuestions.length > 0) {
    prompt += `
==============================================================
PREVIOUSLY USED QUESTIONS - DO NOT REPEAT THESE CONCEPTS
==============================================================
Total previously used: ${storedQuestions.length} questions

${storedQuestions.map((q, i) => `${i + 1}. ${q.questionText}`).join('\n')}

==============================================================
STRICT UNIQUENESS RULES:
==============================================================
1. Understand the INTENT and CONCEPT of each question above
2. Do NOT test the same fact/concept even with different wording
3. Do NOT rephrase, restructure, or reword any question above
4. ONLY test concepts/facts NOT covered in the above list
5. Use the SAME source material but find UNTESTED aspects
6. You MAY change difficulty level, question format, or language style
7. If ALL concepts from study material are exhausted, generate FEWER questions

IMPORTANT: If you cannot generate ${config.questionCount} unique questions:
- Generate as many TRULY UNIQUE questions as possible
- Include a "message" field explaining how many you could generate
- Example: "message": "Only 3 unique questions possible. All other concepts from the study material have been tested."

`;
  }

  prompt += `OUTPUT FORMAT - Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "The complete question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this answer is correct",
      "topic": "Specific topic/concept this question tests"
    }
  ],
  "message": "Optional - only include if you couldn't generate all ${config.questionCount} questions"
}
FINAL CHECKLIST:
- Try to generate ${config.questionCount} UNIQUE questions
- If unique concepts are exhausted, generate fewer but include "message" explaining why
- All 4 options must be plausible but only one correct
- Each question must test a DIFFERENT concept/fact
- NEVER repeat or rephrase previously used questions`;

  return prompt;
}

function shuffleQuestionOptions(question: Question): Question {
  const optionEntries = question.options.map((option, index) => ({
    option,
    originalIndex: index,
  }));

  for (let i = optionEntries.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [optionEntries[i], optionEntries[randomIndex]] = [optionEntries[randomIndex], optionEntries[i]];
  }

  const shuffledOptions = optionEntries.map((entry) => entry.option);
  const updatedCorrectAnswer = optionEntries.findIndex(
    (entry) => entry.originalIndex === question.correctAnswer
  );

  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: updatedCorrectAnswer >= 0 ? updatedCorrectAnswer : question.correctAnswer,
  };
}

function getProviderErrorMessage(provider: 'openrouter' | 'gemini', errorData: any): string {
  const fallback = 'Failed to generate questions. Please check your API key.';
  const rawMessage =
    errorData?.error?.message ||
    errorData?.message ||
    errorData?.error?.status ||
    '';

  if (provider === 'gemini') {
    const text = String(rawMessage || '').toLowerCase();
    const quotaExceeded =
      text.includes('quota exceeded') ||
      text.includes('rate limit') ||
      text.includes('free_tier_requests') ||
      text.includes('free_tier_input_token_count');

    if (quotaExceeded) {
      return 'Gemini free quota abhi exhausted hai for this key/project. Thoda wait karke retry karein, ya OpenRouter provider use karein.';
    }
  }

  return rawMessage || fallback;
}
