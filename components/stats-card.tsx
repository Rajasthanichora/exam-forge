'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Target, Trophy, Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getAverageScore, getTotalTestsTaken, getTotalQuestionsStored } from '@/lib/test-store';

export function StatsCard() {
  const [stats, setStats] = useState({ total: 0, average: 0, storedQuestions: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStats({
      total: getTotalTestsTaken(),
      average: getAverageScore(),
      storedQuestions: getTotalQuestionsStored(),
    });
  }, []);

  if (!mounted || stats.total === 0) return null;

  return (
    <Card className="bg-card/50 border-border mb-8">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Tests:</span>
            <span className="font-semibold text-foreground">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-success" />
            <span className="text-muted-foreground">Avg Score:</span>
            <span className="font-semibold text-foreground">{stats.average}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Questions Stored:</span>
            <span className="font-semibold text-foreground">{stats.storedQuestions}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-warning" />
            <span className="text-muted-foreground">Tracking active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
