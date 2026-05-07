'use client';

import { useState, useEffect } from 'react';
import { subscribeToLogs, getLogs, clearLogs, LogEntry } from '@/lib/debug-logger';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { X, Trash2, Database, RefreshCw } from 'lucide-react';

interface SupabaseData {
  appSettings: any;
  sections: any[];
  savedDocuments: any[];
  storedQuestions: any[];
  testResults: any[];
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [supabaseData, setSupabaseData] = useState<SupabaseData | null>(null);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToLogs((newLogs) => {
      setLogs(newLogs);
    });
    
    // Load initial logs
    setLogs(getLogs());
    
    return unsubscribe;
  }, []);

  const fetchSupabaseData = async () => {
    setIsLoadingSupabase(true);
    try {
      const supabase = createClient();
      
      // Fetch app settings
      const { data: appSettings, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .single();
      
      // Fetch sections
      const { data: sections } = await supabase
        .from('sections')
        .select('*');
      
      // Fetch documents
      const { data: savedDocuments } = await supabase
        .from('saved_documents')
        .select('*');
      
      // Fetch questions
      const { data: storedQuestions } = await supabase
        .from('stored_questions')
        .select('*');
      
      // Fetch test results
      const { data: testResults } = await supabase
        .from('test_results')
        .select('*');
      
      setSupabaseData({
        appSettings: settingsError ? { error: settingsError.message } : appSettings,
        sections: sections || [],
        savedDocuments: savedDocuments || [],
        storedQuestions: storedQuestions || [],
        testResults: testResults || [],
      });
    } catch (error) {
      setSupabaseData({
        appSettings: { error: String(error) },
        sections: [],
        savedDocuments: [],
        storedQuestions: [],
        testResults: [],
      });
    } finally {
      setIsLoadingSupabase(false);
    }
  };

  // Auto-refresh supabase counts when opened
  useEffect(() => {
    if (isOpen) fetchSupabaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const allowedLogMessages = new Set([
    'App setting fetched successfully',
    'App settings update to supabase successfully',
    'App settings error',
    'Api key fetched successfully',
    'Api key update to supabase successfully',
    'Api key error',
    'Study meteriel  fetched successfully',
    'Study meteriel  update to supabase successfully',
    'Study meteriel',
    'Test fetched successfully',
    'Test update to supabase successfully',
    'Test error',
    'Questions fetched successfully',
    'Gemini api key currunty working succefully',
    'Openrouter api key currunty working succefully',
    'Gemini api key error',
  ]);

  const normalizeMessage = (msg: string) => {
    // normalize common variants into the exact display strings requested
    if (msg === 'App settings fetched successfully') return 'App setting fetched successfully';
    if (msg === 'App settings saved to Supabase') return 'App settings update to supabase successfully';
    if (msg === 'Failed to save app settings to Supabase') return 'App settings error';
    if (msg === 'Study material fetched successfully') return 'Study meteriel  fetched successfully';
    return msg;
  };

  const compactLogs = logs
    .map((l) => normalizeMessage(l.message))
    .filter((m) => allowedLogMessages.has(m));

  // keep order, but remove duplicates so panel stays clean
  const uniqueCompactLogs: string[] = [];
  for (const m of compactLogs) {
    if (!uniqueCompactLogs.includes(m)) uniqueCompactLogs.push(m);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-slate-800 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors text-xs flex items-center gap-2"
      >
        <Database className="w-4 h-4" />
        Debug
        {logs.length > 0 && (
          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {logs.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 left-2 sm:bottom-4 sm:left-4 z-50 w-[calc(100vw-1rem)] sm:w-96 max-w-96 max-h-[70vh] bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm">Debug Panel</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto max-h-[50vh]">
        <div className="p-3 space-y-3">
          {/* Compact Supabase summary */}
          {isLoadingSupabase ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          ) : supabaseData ? (
            <div className="text-xs space-y-1">
              <div>App Settings:{supabaseData.appSettings?.error ? 'Error' : 'OK'}</div>
              <div>Sections:{supabaseData.sections.length}</div>
              <div>Documents:{supabaseData.savedDocuments.length}</div>
              <div>Questions:{supabaseData.storedQuestions.length}</div>
              <div>Test Results:{supabaseData.testResults.length}</div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs">Loading...</div>
          )}

          <div className="border-t border-slate-700" />

          {/* Only the requested log lines */}
          <div className="text-xs whitespace-pre-line leading-5">
            {uniqueCompactLogs.length > 0 ? uniqueCompactLogs.join('\n') : '...'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-700 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSupabaseData}
          disabled={isLoadingSupabase}
          className="flex-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingSupabase ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearLogs}
          className="flex-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
