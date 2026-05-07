'use client';

import { Trash2, ChevronRight, Trophy, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TestResult } from '@/lib/types';
import { getTestHistory, clearTestHistory, getAverageScore, getTotalTestsTaken, getTotalQuestionsStored } from '@/lib/test-store';
import { useEffect, useState } from 'react';

interface TestHistoryProps {
  onClose: () => void;
}

export function TestHistory({ onClose }: TestHistoryProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [averageScore, setAverageScore] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [storedQuestions, setStoredQuestions] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const history = getTestHistory();
    setResults(history.results);
    setAverageScore(getAverageScore());
    setTotalTests(getTotalTestsTaken());
    setStoredQuestions(getTotalQuestionsStored());
  };

  const handleClearHistory = () => {
    clearTestHistory();
    loadHistory();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-primary';
    if (percentage >= 40) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Test History</h2>
          <p className="text-muted-foreground">Track your progress over time</p>
        </div>
        <Button variant="outline" onClick={onClose} className="border-border text-foreground">
          Back
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalTests}</p>
                <p className="text-sm text-muted-foreground">Tests Taken</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{averageScore}%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {results.length > 0 ? formatDate(results[0].date).split(',')[0] : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">Last Test</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{storedQuestions}</p>
                <p className="text-sm text-muted-foreground">Questions Tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clear History Button */}
      {results.length > 0 && (
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Clear Test History?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will permanently delete all your test history and progress data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border text-foreground">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearHistory}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear History
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Results List */}
      {results.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-foreground font-medium">No test history yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Complete your first test to see your progress here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((result) => {
              const percentage = Math.round((result.score / result.totalQuestions) * 100);
              return (
                <div
                  key={result.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>
                    {percentage}%
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{result.config.language.charAt(0).toUpperCase() + result.config.language.slice(1)} Test</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground capitalize">
                        {result.config.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                        {result.totalQuestions} questions
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {result.score}/{result.totalQuestions} correct
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{formatDate(result.date)}</p>
                    {result.timeTaken && (
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
