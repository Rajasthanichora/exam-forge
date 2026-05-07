// Debug Logger for Supabase Operations
export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'supabase';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: any;
  source: string;
}

let logs: LogEntry[] = [];
let listeners: ((logs: LogEntry[]) => void)[] = [];

function generateId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function notifyListeners() {
  listeners.forEach(listener => listener([...logs]));
}

export function addLog(level: LogLevel, message: string, details?: any, source = 'app') {
  const entry: LogEntry = {
    id: generateId(),
    timestamp: new Date().toLocaleTimeString(),
    level,
    message,
    details,
    source,
  };
  
  logs.unshift(entry);
  
  // Keep only last 100 logs
  if (logs.length > 100) {
    logs = logs.slice(0, 100);
  }
  
  notifyListeners();
  
  // Also log to console
  const consoleMsg = `[${entry.timestamp}] [${level.toUpperCase()}] [${source}] ${message}`;
  switch (level) {
    case 'error':
      console.error(consoleMsg, details || '');
      break;
    case 'warn':
      console.warn(consoleMsg, details || '');
      break;
    case 'supabase':
      console.log('%c' + consoleMsg, 'color: #3b82f6; font-weight: bold;', details || '');
      break;
    case 'success':
      console.log('%c' + consoleMsg, 'color: #22c55e; font-weight: bold;', details || '');
      break;
    default:
      console.log(consoleMsg, details || '');
  }
}

export function subscribeToLogs(callback: (logs: LogEntry[]) => void) {
  listeners.push(callback);
  callback([...logs]);
  
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

export function getLogs(): LogEntry[] {
  return [...logs];
}

export function clearLogs() {
  logs = [];
  notifyListeners();
}

// Helper functions for specific log types
export const logInfo = (msg: string, details?: any, source?: string) => addLog('info', msg, details, source);
export const logWarn = (msg: string, details?: any, source?: string) => addLog('warn', msg, details, source);
export const logError = (msg: string, details?: any, source?: string) => addLog('error', msg, details, source);
export const logSuccess = (msg: string, details?: any, source?: string) => addLog('success', msg, details, source);
export const logSupabase = (msg: string, details?: any, source?: string) => addLog('supabase', msg, details, source);

// Detailed Supabase query logging wrapper
export async function logSupabaseQuery<T>(
  operation: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  source: string,
  logData?: any
): Promise<{ data: T | null; error: any }> {
  const startTime = performance.now();
  
  logSupabase(`[REQUEST] ${operation}`, {
    ...logData,
    timestamp: new Date().toISOString(),
  }, source);
  
  try {
    const result = await queryFn();
    const duration = Math.round(performance.now() - startTime);
    
    if (result.error) {
      logError(`[RESPONSE] ${operation} failed (${duration}ms)`, {
        error: result.error,
        errorCode: result.error.code,
        errorMessage: result.error.message,
        hint: result.error.hint,
        details: result.error.details,
      }, source);
    } else {
      logSuccess(`[RESPONSE] ${operation} success (${duration}ms)`, {
        data: result.data,
        rowCount: Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0,
      }, source);
    }
    
    return result;
  } catch (e) {
    const duration = Math.round(performance.now() - startTime);
    logError(`[EXCEPTION] ${operation} crashed (${duration}ms)`, {
      exception: e,
      stack: e instanceof Error ? e.stack : undefined,
    }, source);
    return { data: null, error: e };
  }
}

// Log connection test
export async function testSupabaseConnection() {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  
  logInfo('Testing Supabase connection...', null, 'connection-test');
  
  try {
    // Test 1: Basic connection
    const start = performance.now();
    const { error: healthError } = await supabase.from('app_settings').select('count', { count: 'exact', head: true });
    const duration = Math.round(performance.now() - start);
    
    if (healthError && healthError.code === 'PGRST205') {
      logError(`Connection test FAILED (${duration}ms) - Schema cache issue`, {
        code: healthError.code,
        message: healthError.message,
        hint: 'Tables exist but PostgREST schema cache needs refresh',
      }, 'connection-test');
      return { connected: false, error: healthError, schemaCacheIssue: true };
    }
    
    if (healthError) {
      logError(`Connection test FAILED (${duration}ms)`, healthError, 'connection-test');
      return { connected: false, error: healthError };
    }
    
    logSuccess(`Connection test PASSED (${duration}ms)`, null, 'connection-test');
    
    // Test 2: List all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['app_settings', 'sections', 'saved_documents', 'stored_questions', 'test_results']);
    
    if (tablesError) {
      logWarn('Could not list tables', tablesError, 'connection-test');
    } else {
      logInfo('Available tables', { tables: tables?.map(t => t.table_name) }, 'connection-test');
    }
    
    return { connected: true, tables: tables?.map(t => t.table_name) || [] };
  } catch (e) {
    logError('Connection test EXCEPTION', { exception: String(e) }, 'connection-test');
    return { connected: false, error: e };
  }
}
