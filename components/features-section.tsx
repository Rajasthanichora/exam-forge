'use client';

import { Brain, Languages, History, FileText, RefreshCcw, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Multiple Input Methods',
    description: 'Paste notes directly or upload multiple DOCX files for extraction',
  },
  {
    icon: Brain,
    title: 'AI-Powered Generation',
    description: 'Intelligent question creation based on your study content',
  },
  {
    icon: RefreshCcw,
    title: 'No Repetition',
    description: 'Smart tracking ensures unique questions across all tests',
  },
  {
    icon: Languages,
    title: 'Trilingual Support',
    description: 'Generate tests in English, Hindi, or Hinglish',
  },
  {
    icon: History,
    title: 'Similarity Detection',
    description: 'Real-time indicator shows question uniqueness rate',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description: 'Complete history with analytics of all your attempts',
  },
];

export function FeaturesSection() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="p-4 rounded-lg bg-card/50 border border-border hover:border-primary/50 transition-colors"
        >
          <feature.icon className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
          <p className="text-sm text-muted-foreground">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
