'use client';

import { useState, useEffect } from 'react';
import { Check, X, ChevronRight, ChevronLeft, Flag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Question } from '@/lib/types';

interface QuizInterfaceProps {
  questions: Question[];
  onComplete: (answers: Record<string, number>, timeTaken: number) => void;
}

export function QuizInterface({ questions, onComplete }: QuizInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(optionIndex);
    setShowFeedback(true);
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      onComplete(answers, elapsedTime);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(answers[questions[currentIndex + 1]?.id] ?? null);
      setShowFeedback(answers[questions[currentIndex + 1]?.id] !== undefined);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      const prevQuestion = questions[currentIndex - 1];
      const prevAnswer = answers[prevQuestion.id];
      setSelectedAnswer(prevAnswer ?? null);
      setShowFeedback(prevAnswer !== undefined);
    }
  };

  const toggleFlag = () => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id);
      } else {
        newSet.add(currentQuestion.id);
      }
      return newSet;
    });
  };

  const jumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    const question = questions[index];
    const answer = answers[question.id];
    setSelectedAnswer(answer ?? null);
    setShowFeedback(answer !== undefined);
  };

  const getOptionClass = (optionIndex: number) => {
    const baseClass = 'w-full p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3';
    
    if (!showFeedback) {
      return `${baseClass} ${
        selectedAnswer === optionIndex
          ? 'border-primary bg-primary/10'
          : 'border-border bg-secondary/50 hover:border-primary/50 cursor-pointer'
      }`;
    }

    if (optionIndex === currentQuestion.correctAnswer) {
      return `${baseClass} border-success bg-success/10`;
    }
    
    if (selectedAnswer === optionIndex && optionIndex !== currentQuestion.correctAnswer) {
      return `${baseClass} border-destructive bg-destructive/10`;
    }

    return `${baseClass} border-border bg-secondary/30 opacity-60`;
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Badge variant="outline" className="text-foreground border-border">
                Question {currentIndex + 1} of {questions.length}
              </Badge>
              <Badge variant={currentQuestion.difficulty === 'hard' ? 'destructive' : currentQuestion.difficulty === 'medium' ? 'default' : 'secondary'}>
                {currentQuestion.difficulty}
              </Badge>
              {currentQuestion.topic && (
                <Badge variant="outline" className="text-primary border-primary/50">
                  {currentQuestion.topic}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFlag}
                className={flaggedQuestions.has(currentQuestion.id) ? 'text-warning' : 'text-muted-foreground'}
              >
                <Flag className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{answeredCount} answered</span>
            <span>{questions.length - answeredCount} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-foreground leading-relaxed">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={showFeedback}
              className={getOptionClass(index).replace('p-4', 'p-3 sm:p-4')}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                showFeedback && index === currentQuestion.correctAnswer
                  ? 'bg-success text-success-foreground'
                  : showFeedback && selectedAnswer === index
                  ? 'bg-destructive text-destructive-foreground'
                  : selectedAnswer === index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-foreground flex-1">{option}</span>
              {showFeedback && index === currentQuestion.correctAnswer && (
                <Check className="w-5 h-5 text-success shrink-0" />
              )}
              {showFeedback && selectedAnswer === index && index !== currentQuestion.correctAnswer && (
                <X className="w-5 h-5 text-destructive shrink-0" />
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Feedback */}
      {showFeedback && currentQuestion.explanation && (
        <Card className={`border-2 ${
          selectedAnswer === currentQuestion.correctAnswer
            ? 'border-success bg-success/5'
            : 'border-destructive bg-destructive/5'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {selectedAnswer === currentQuestion.correctAnswer ? (
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-success" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                  <X className="w-5 h-5 text-destructive" />
                </div>
              )}
              <div>
                <p className={`font-medium ${
                  selectedAnswer === currentQuestion.correctAnswer ? 'text-success' : 'text-destructive'
                }`}>
                  {selectedAnswer === currentQuestion.correctAnswer ? 'Correct!' : 'Incorrect'}
                </p>
                <p className="text-muted-foreground mt-1">{currentQuestion.explanation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="border-border text-foreground w-full sm:w-auto order-2 sm:order-1"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-1 overflow-x-auto max-w-full sm:max-w-md px-2 py-1 order-1 sm:order-2 scrollbar-thin">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => jumpToQuestion(index)}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-xs font-medium shrink-0 transition-all ${
                index === currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : answers[q.id] !== undefined
                  ? answers[q.id] === q.correctAnswer
                    ? 'bg-success/20 text-success border border-success/50'
                    : 'bg-destructive/20 text-destructive border border-destructive/50'
                  : flaggedQuestions.has(q.id)
                  ? 'bg-warning/20 text-warning border border-warning/50'
                  : 'bg-secondary text-muted-foreground border border-border'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <Button
          onClick={handleNext}
          disabled={!showFeedback}
          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto order-3"
        >
          {isLastQuestion ? 'Finish Test' : 'Next'}
          {!isLastQuestion && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
