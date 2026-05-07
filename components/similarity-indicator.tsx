'use client';

import { AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SimilarityReport } from '@/lib/types';
import { useState } from 'react';

interface SimilarityIndicatorProps {
  report: SimilarityReport;
}

export function SimilarityIndicator({ report }: SimilarityIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const getStatusColor = () => {
    if (report.similarityPercentage <= 10) return 'text-success';
    if (report.similarityPercentage <= 30) return 'text-warning';
    return 'text-destructive';
  };
  
  const getStatusIcon = () => {
    if (report.similarityPercentage <= 10) {
      return <CheckCircle className="w-5 h-5 text-success" />;
    }
    if (report.similarityPercentage <= 30) {
      return <Info className="w-5 h-5 text-warning" />;
    }
    return <AlertTriangle className="w-5 h-5 text-destructive" />;
  };
  
  const getStatusMessage = () => {
    if (report.similarityPercentage <= 10) {
      return 'Excellent! Most questions are unique.';
    }
    if (report.similarityPercentage <= 30) {
      return 'Good variety with some similar questions.';
    }
    return 'High repetition detected. Consider adding more study material.';
  };
  
  const getProgressColor = () => {
    if (report.similarityPercentage <= 10) return 'bg-success';
    if (report.similarityPercentage <= 30) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground text-base">
          {getStatusIcon()}
          Question Uniqueness Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className={`text-2xl font-bold ${getStatusColor()}`}>
              {100 - report.similarityPercentage}% Unique
            </p>
            <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{report.uniqueQuestions} unique</p>
            <p>{report.similarQuestions} similar</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Similarity Rate</span>
            <span>{report.similarityPercentage}%</span>
          </div>
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`absolute left-0 top-0 h-full ${getProgressColor()} transition-all duration-500`}
              style={{ width: `${report.similarityPercentage}%` }}
            />
          </div>
        </div>

        {report.flaggedQuestions.length > 0 && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                {showDetails ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Similar Questions
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    View Similar Questions ({report.flaggedQuestions.length})
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {report.flaggedQuestions.slice(0, 5).map((item, index) => (
                <div key={index} className="bg-secondary/50 rounded-lg p-3 space-y-2 border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">New Question:</p>
                      <p className="text-sm text-foreground line-clamp-2">{item.newQuestion}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      item.similarity >= 0.8 ? 'bg-destructive/20 text-destructive' :
                      item.similarity >= 0.6 ? 'bg-warning/20 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {Math.round(item.similarity * 100)}% match
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Similar to:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.similarTo}</p>
                  </div>
                </div>
              ))}
              {report.flaggedQuestions.length > 5 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{report.flaggedQuestions.length - 5} more similar questions
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
