'use client';

import { useState } from 'react';
import { Trash2, ChevronRight, Trophy, Calendar, BarChart3, Edit2, Check, X, RotateCcw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TestResult } from '@/lib/types';

interface SectionHistoryProps {
  testResults: TestResult[];
  sectionName: string;
  questionsStored: number;
  documentsCount: number;
  onRenameTest: (testId: string, newName: string) => void;
  onDeleteTest: (testId: string) => void;
  onRetakeTest: (test: TestResult) => void;
  onClearAll: () => void;
  onBack: () => void;
}

export function SectionHistory({
  testResults,
  sectionName,
  questionsStored,
  documentsCount,
  onRenameTest,
  onDeleteTest,
  onRetakeTest,
  onClearAll,
  onBack,
}: SectionHistoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TestResult | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const totalTests = testResults.length;
  const averageScore = totalTests > 0
    ? Math.round(testResults.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0) / totalTests)
    : 0;

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

  const handleStartEdit = (test: TestResult) => {
    setEditingId(test.id);
    setEditName(test.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onRenameTest(editingId, editName.trim());
      setEditingId(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Test History</h2>
            <p className="text-muted-foreground">Section: {sectionName}</p>
          </div>
          <Button variant="outline" onClick={onBack} className="border-border text-foreground">
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
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{questionsStored}</p>
                  <p className="text-sm text-muted-foreground">Questions Tracked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{documentsCount}</p>
                  <p className="text-sm text-muted-foreground">Saved Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clear History Button */}
        {testResults.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All History
            </Button>
          </div>
        )}

        {/* Results List */}
        {testResults.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-foreground font-medium">No test history yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Complete your first test in this section to see your progress here
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Saved Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testResults.map((result) => {
                const percentage = Math.round((result.score / result.totalQuestions) * 100);
                return (
                  <div
                    key={result.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className={`text-3xl font-bold ${getScoreColor(percentage)} sm:min-w-[60px]`}>
                      {percentage}%
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === result.id ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 bg-input"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveEdit}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium text-foreground">{result.name}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="outline" className="text-xs border-border text-muted-foreground capitalize">
                              {result.config.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-border text-muted-foreground capitalize">
                              {result.config.language}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                              {result.totalQuestions} questions
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {result.score}/{result.totalQuestions} correct
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="text-left sm:text-right sm:ml-auto">
                      <p className="text-sm text-muted-foreground">{formatDate(result.date)}</p>
                      {result.timeTaken && (
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s
                        </p>
                      )}
                    </div>
                    
                    {editingId !== result.id && (
                      <div className="flex items-center gap-1 sm:ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEdit(result)}
                          title="Rename test"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary"
                          onClick={() => onRetakeTest(result)}
                          title="Retake test"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(result)}
                          title="Delete test"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-5 h-5 text-muted-foreground hidden sm:block" />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Single Test Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Test?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete &quot;{deleteTarget?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  onDeleteTest(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Clear All History?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete all test history and question tracking data for this section. 
              Saved documents will not be affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClearAll();
                setShowClearConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
