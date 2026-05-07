'use client';

import { Check, X, RotateCcw, Home, Trophy, Target, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Question, TestConfig } from '@/lib/types';

interface TestResultsProps {
  questions: Question[];
  answers: Record<string, number>;
  config: TestConfig;
  timeTaken: number;
  onRetry: () => void;
  onNewTest: () => void;
}

export function TestResults({
  questions,
  answers,
  config,
  timeTaken,
  onRetry,
  onNewTest,
}: TestResultsProps) {
  const correctAnswers = questions.filter(
    (q) => answers[q.id] === q.correctAnswer
  ).length;
  const incorrectAnswers = questions.length - correctAnswers;
  const percentage = Math.round((correctAnswers / questions.length) * 100);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getGrade = (pct: number) => {
    if (pct >= 90) return { grade: 'A+', color: 'text-success', message: 'Outstanding!' };
    if (pct >= 80) return { grade: 'A', color: 'text-success', message: 'Excellent!' };
    if (pct >= 70) return { grade: 'B', color: 'text-primary', message: 'Good Job!' };
    if (pct >= 60) return { grade: 'C', color: 'text-warning', message: 'Keep Practicing!' };
    if (pct >= 50) return { grade: 'D', color: 'text-warning', message: 'Needs Improvement' };
    return { grade: 'F', color: 'text-destructive', message: 'Try Again!' };
  };

  const { grade, color, message } = getGrade(percentage);

  const topicPerformance = questions.reduce((acc, q) => {
    const topic = q.topic || 'General';
    if (!acc[topic]) {
      acc[topic] = { correct: 0, total: 0 };
    }
    acc[topic].total++;
    if (answers[q.id] === q.correctAnswer) {
      acc[topic].correct++;
    }
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-muted-foreground mb-2">Your Score</p>
              <div className="flex items-end gap-2">
                <span className={`text-6xl font-bold ${color}`}>{percentage}%</span>
                <span className={`text-4xl font-bold ${color}`}>{grade}</span>
              </div>
              <p className="text-xl text-foreground mt-2">{message}</p>
            </div>
            <div className="w-40 h-40 relative">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`${percentage * 2.83} 283`}
                  className={color}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className={`w-12 h-12 ${color}`} />
              </div>
            </div>
          </div>
        </div>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-secondary/50 rounded-lg">
              <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{questions.length}</p>
              <p className="text-sm text-muted-foreground">Total Questions</p>
            </div>
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <Check className="w-6 h-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold text-success">{correctAnswers}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div className="text-center p-4 bg-destructive/10 rounded-lg">
              <X className="w-6 h-6 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{incorrectAnswers}</p>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
            <div className="text-center p-4 bg-secondary/50 rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{formatTime(timeTaken)}</p>
              <p className="text-sm text-muted-foreground">Time Taken</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topic Performance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5 text-primary" />
            Performance by Topic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(topicPerformance).map(([topic, { correct, total }]) => {
            const topicPct = Math.round((correct / total) * 100);
            return (
              <div key={topic}>
                <div className="flex justify-between mb-2">
                  <span className="text-foreground">{topic}</span>
                  <span className="text-muted-foreground">
                    {correct}/{total} ({topicPct}%)
                  </span>
                </div>
                <Progress value={topicPct} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Test Details */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Test Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-border text-foreground capitalize">
              {config.difficulty}
            </Badge>
            <Badge variant="outline" className="border-border text-foreground capitalize">
              {config.language}
            </Badge>
            <Badge variant="outline" className="border-border text-foreground">
              {config.questionCount} Questions
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Question Review */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Question Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, index) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correctAnswer;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-lg border ${
                  isCorrect ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                    isCorrect ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-foreground font-medium mb-2">{q.question}</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        Your answer:{' '}
                        <span className={isCorrect ? 'text-success' : 'text-destructive'}>
                          {String.fromCharCode(65 + userAnswer)}. {q.options[userAnswer]}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-muted-foreground">
                          Correct answer:{' '}
                          <span className="text-success">
                            {String.fromCharCode(65 + q.correctAnswer)}. {q.options[q.correctAnswer]}
                          </span>
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-muted-foreground mt-2 italic">{q.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          onClick={onRetry}
          className="flex-1 border-border text-foreground hover:bg-secondary"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Retry Same Test
        </Button>
        <Button
          onClick={onNewTest}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Home className="w-4 h-4 mr-2" />
          Create New Test
        </Button>
      </div>
    </div>
  );
}
