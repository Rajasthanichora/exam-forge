import { createClient } from '@/lib/supabase/client';
import { AppData, Section, SavedDocument, StoredQuestion, TestResult, SimilarityReport } from './types';
import { logInfo, logError, logSuccess, logSupabase, logWarn } from './debug-logger';

// In-memory cache for instant UI updates
let cachedAppData: AppData | null = null;
let isInitialized = false;
let supabaseConnected = false;

// Check if table exists using RPC or direct query
async function checkTableExists(supabase: ReturnType<typeof createClient>, tableName: string): Promise<boolean> {
  try {
    // Try to query the table directly
    const { error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    // If no error, table exists
    if (!error) return true;
    
    // PGRST205 = table not in schema cache (but might exist)
    // PGRST116 = no rows found (table exists but empty)
    // 42P01 = PostgreSQL table does not exist
    if (error.code === 'PGRST205' || error.code === 'PGRST116') {
      // Schema cache issue or no rows - table likely exists but cache needs refresh
      return true; 
    }
    if (error.message?.includes('does not exist') || error.message?.includes('42P01')) {
      return false;
    }
    return true; // Other errors might be permission-related
  } catch {
    return false;
  }
}

// Check for schema cache issues specifically
function isSchemaCacheError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code;
  const message = error.message || '';
  return code === 'PGRST205' || message.includes('schema cache') || message.includes('in the schema cache');
}

// Setup database tables if they don't exist
async function setupDatabase(supabase: ReturnType<typeof createClient>): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to create tables using RPC (if function exists) or direct SQL
    // For now, we'll just check if we can create the initial app_settings row
    const { error: insertError } = await supabase
      .from('app_settings')
      .insert({ id: 1, api_key: '', active_section_id: null })
      .select()
      .single();
    
    if (insertError && !insertError.message?.includes('duplicate key')) {
      return { success: false, error: insertError.message };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Check Supabase connection status
export async function checkSupabaseConnection(): Promise<{ connected: boolean; error?: string; tablesMissing?: boolean }> {
  if (typeof window === 'undefined') {
    return { connected: false, error: 'Server-side rendering' };
  }

  try {
    const supabase = createClient();
    
    // Check if required tables exist
    const tables = ['app_settings', 'sections', 'saved_documents', 'stored_questions', 'test_results'];
    const missingTables: string[] = [];
    
    for (const table of tables) {
      const exists = await checkTableExists(supabase, table);
      if (!exists) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      supabaseConnected = false;
      return { 
        connected: false, 
        error: `Missing tables: ${missingTables.join(', ')}. Please run the SQL setup script.`,
        tablesMissing: true 
      };
    }
    
    // Try to fetch app settings to verify full connection
    const { data, error } = await supabase
      .from('app_settings')
      .select('id')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found, which is OK
      supabaseConnected = false;
      return { connected: false, error: error.message };
    }

    supabaseConnected = true;
    return { connected: true };
  } catch (error) {
    supabaseConnected = false;
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get cached connection status
export function isSupabaseConnected(): boolean {
  return supabaseConnected;
}

// Initialize default app data
function getDefaultAppData(): AppData {
  return {
    sections: [],
    apiKey: '',
    geminiApiKey: '',
    aiProvider: 'openrouter',
    activeSectionId: null,
  };
}

// Initialize data from Supabase
export async function initializeFromSupabase(): Promise<AppData & { supabaseConnected: boolean; tablesMissing?: boolean }> {
  if (typeof window === 'undefined') {
    return { ...getDefaultAppData(), supabaseConnected: false };
  }

  try {
    const supabase = createClient();

    // First check if all required tables exist
    const tables = ['app_settings', 'sections', 'saved_documents', 'stored_questions', 'test_results'];
    const missingTables: string[] = [];
    
    for (const table of tables) {
      const exists = await checkTableExists(supabase, table);
      if (!exists) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      logError('Missing Supabase tables', missingTables, 'initializeFromSupabase');
      supabaseConnected = false;
      return { 
        ...getDefaultAppData(), 
        supabaseConnected: false,
        tablesMissing: true 
      };
    }
    
    logSupabase('All tables exist, fetching app settings...', null, 'initializeFromSupabase');

    // Fetch app settings
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    // Check if this is a schema cache error (PGRST205)
    if (settingsError && isSchemaCacheError(settingsError)) {
      logWarn('Supabase schema cache needs refresh', settingsError, 'initializeFromSupabase');
      // Try to work around by assuming tables exist and trying to insert
      try {
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert({ id: 1, api_key: '', active_section_id: null })
          .select()
          .single();
        
        // If insert succeeds or gives duplicate key error, tables exist
        if (!insertError || insertError.message?.includes('duplicate key')) {
          logSuccess('Tables exist! Schema cache needs refresh but data operations work', null, 'initializeFromSupabase');
          // Continue with empty data - will sync on next operations
        } else if (insertError.message?.includes('does not exist') || insertError.code === '42P01') {
          // Tables really don't exist
          logError('Tables actually missing', insertError, 'initializeFromSupabase');
          supabaseConnected = false;
          return { 
            ...getDefaultAppData(), 
            supabaseConnected: false,
            tablesMissing: true 
          };
        }
      } catch (e) {
        console.error('Error during schema cache workaround:', e);
      }
    } else if (settingsError?.code === 'PGRST116') {
      // No row found, create default
      const { error: insertError } = await supabase
        .from('app_settings')
        .insert({ id: 1, api_key: '', active_section_id: null })
        .select()
        .single();
        
      if (insertError && !insertError.message?.includes('duplicate key')) {
        console.error('Error creating default settings:', insertError);
      }
    } else if (settingsError) {
      logError('Supabase settings error', settingsError, 'initializeFromSupabase');
      supabaseConnected = false;
      return { 
        ...getDefaultAppData(), 
        supabaseConnected: false,
        tablesMissing: isSchemaCacheError(settingsError)
      };
    }
    
    logSuccess('App settings fetched successfully', settings, 'initializeFromSupabase');
    logSuccess('App setting fetched successfully', null, 'initializeFromSupabase');

    supabaseConnected = true;

    // Fetch all sections
    const { data: sectionsData } = await supabase
      .from('sections')
      .select('*')
      .order('created_at', { ascending: false });

    const sections: Section[] = [];

    if (sectionsData) {
      for (const sec of sectionsData) {
        // Fetch documents for this section
        const { data: docs } = await supabase
          .from('saved_documents')
          .select('*')
          .eq('section_id', sec.id)
          .order('uploaded_at', { ascending: false });

        // Fetch stored questions for this section
        const { data: questions } = await supabase
          .from('stored_questions')
          .select('*')
          .eq('section_id', sec.id)
          .order('date_used', { ascending: false });

        // Fetch test results for this section
        const { data: results } = await supabase
          .from('test_results')
          .select('*')
          .eq('section_id', sec.id)
          .order('date', { ascending: false });

        // Deduplicate documents by ID
        const uniqueDocs = new Map();
        (docs || []).forEach(d => {
          if (!uniqueDocs.has(d.id)) {
            uniqueDocs.set(d.id, {
              id: d.id,
              name: d.name,
              content: d.content,
              size: d.size,
              uploadedAt: d.uploaded_at,
            });
          }
        });
        
        // Deduplicate questions by hash
        const uniqueQuestions = new Map();
        (questions || []).forEach(q => {
          if (!uniqueQuestions.has(q.question_hash)) {
            uniqueQuestions.set(q.question_hash, {
              questionHash: q.question_hash,
              questionText: q.question_text,
              topic: q.topic,
              dateUsed: q.date_used,
              testId: q.test_id || undefined,
            });
          }
        });
        
        // Deduplicate test results by ID
        const uniqueResults = new Map();
        (results || []).forEach(r => {
          if (!uniqueResults.has(r.id)) {
            uniqueResults.set(r.id, {
              id: r.id,
              name: r.name,
              date: r.date,
              config: r.config,
              questions: r.questions,
              answers: r.answers,
              score: r.score,
              totalQuestions: r.total_questions,
              timeTaken: r.time_taken,
            });
          }
        });

        sections.push({
          id: sec.id,
          name: sec.name,
          createdAt: sec.created_at,
          pastedNotes: sec.pasted_notes || '',
          savedDocuments: Array.from(uniqueDocs.values()),
          storedQuestions: Array.from(uniqueQuestions.values()),
          testResults: Array.from(uniqueResults.values()),
        });
      }
    }

    cachedAppData = {
      sections,
      apiKey: settings?.api_key || '',
      geminiApiKey: settings?.gemini_api_key || '',
      aiProvider: (settings?.ai_provider === 'gemini' ? 'gemini' : 'openrouter'),
      activeSectionId: settings?.active_section_id || null,
    };

    // Standardized “API key fetched” log (from app_settings.api_key)
    if (cachedAppData.apiKey) {
      logSuccess('Api key fetched successfully', null, 'initializeFromSupabase');
    }
    if (cachedAppData.geminiApiKey) {
      logSuccess('Gemini api key fetched successfully', null, 'initializeFromSupabase');
    }

    // Standardized “Study material fetched” log (documents across all sections)
    const totalDocuments = sections.reduce((sum, s) => sum + (s.savedDocuments?.length || 0), 0);
    logSuccess('Study meteriel  fetched successfully', { documents: totalDocuments }, 'initializeFromSupabase');

    // Standardized “Questions fetched” log (stored questions across all sections)
    const totalQuestions = sections.reduce((sum, s) => sum + (s.storedQuestions?.length || 0), 0);
    if (totalQuestions >= 0) {
      // Keep message stable; details contains count for debugging if needed
      logSuccess('Questions fetched successfully', { questions: totalQuestions }, 'initializeFromSupabase');
    }

    // Standardized “Test fetched” log (test results across all sections)
    const totalTests = sections.reduce((sum, s) => sum + (s.testResults?.length || 0), 0);
    logSuccess('Test fetched successfully', { tests: totalTests }, 'initializeFromSupabase');

    isInitialized = true;
    return { ...cachedAppData, supabaseConnected: true };
  } catch (error) {
    console.error('Error initializing from Supabase:', error);
    supabaseConnected = false;
    return { ...getDefaultAppData(), supabaseConnected: false };
  }
}

// Get all app data (from cache or initialize)
export function getAppData(): AppData {
  if (typeof window === 'undefined') {
    return getDefaultAppData();
  }

  // Return cached data if available
  if (cachedAppData) {
    return cachedAppData;
  }

  // Try to load from localStorage as fallback while Supabase loads
  try {
    const stored = localStorage.getItem('examforge_app_data');
    const apiKey = localStorage.getItem('examforge_openrouter_key') || '';
    const geminiApiKey = localStorage.getItem('examforge_gemini_key') || '';
    const aiProvider = (localStorage.getItem('examforge_ai_provider') as AppData['aiProvider']) || 'openrouter';
    
    if (stored) {
      const parsed = JSON.parse(stored) as AppData;
      cachedAppData = { ...parsed, apiKey, geminiApiKey, aiProvider };
      return cachedAppData!;
    }
  } catch (error) {
    console.error('Error reading app data from localStorage:', error);
  }

  return getDefaultAppData();
}

// Save app data to both cache and Supabase
export async function saveAppData(data: Partial<AppData>): Promise<void> {
  if (typeof window === 'undefined') return;

  logInfo(
    'Saving app data',
    {
      apiKey: data.apiKey ? '***' : undefined,
      geminiApiKey: data.geminiApiKey ? '***' : undefined,
      aiProvider: data.aiProvider,
      activeSectionId: data.activeSectionId
    },
    'saveAppData'
  );

  // Update cache immediately for responsive UI
  const current = getAppData();
  cachedAppData = { ...current, ...data };

  const normalizeSupabaseError = (e: any) => {
    if (!e) return e;
    const message = e?.message || e?.error_description || String(e);
    return {
      code: e?.code,
      message,
      details: e?.details,
      hint: e?.hint,
      status: e?.status,
    };
  };

  try {
    const supabase = createClient();

    const upsertData: Record<string, unknown> = {
      id: 1,
      api_key: data.apiKey !== undefined ? (data.apiKey || null) : (current.apiKey || null),
      gemini_api_key: data.geminiApiKey !== undefined ? (data.geminiApiKey || null) : (current.geminiApiKey || null),
      ai_provider: data.aiProvider !== undefined ? data.aiProvider : current.aiProvider,
      active_section_id: data.activeSectionId !== undefined ? data.activeSectionId : current.activeSectionId,
      updated_at: new Date().toISOString(),
    };
    
    logSupabase('Upserting app_settings', upsertData, 'saveAppData');

    // Ensure row exists so update/upsert remains deterministic
    await supabase
      .from('app_settings')
      .upsert({ id: 1 }, { onConflict: 'id' });

    // Update app settings in Supabase
    let { data: result, error } = await supabase
      .from('app_settings')
      .upsert(upsertData, { onConflict: 'id' })
      .select();
    
    // If optional columns aren't migrated yet, retry while keeping available columns.
    if (error) {
      const msg = String(error.message || '');
      const mentionsGeminiColumn =
        msg.includes('gemini_api_key') ||
        msg.includes('column') && msg.includes('gemini');
      const mentionsProviderColumn =
        msg.includes('ai_provider') ||
        msg.includes('column') && msg.includes('provider');

      if ((mentionsGeminiColumn || mentionsProviderColumn) && ('gemini_api_key' in upsertData || 'ai_provider' in upsertData)) {
        if (mentionsGeminiColumn && data.geminiApiKey !== undefined) {
          throw new Error('Supabase migration pending: gemini_api_key column is missing in app_settings.');
        }
        logWarn(
          'Settings columns missing - retrying without new fields (run SQL migration)',
          normalizeSupabaseError(error),
          'saveAppData'
        );

        const retryData: Record<string, unknown> = { ...upsertData };
        if (mentionsProviderColumn) {
          delete retryData.ai_provider;
        }
        if (mentionsGeminiColumn) {
          delete retryData.gemini_api_key;
        }

        ({ data: result, error } = await supabase
          .from('app_settings')
          .upsert(retryData, { onConflict: 'id' })
          .select());
      }
    }

    if (error) {
      const normalized = normalizeSupabaseError(error);
      logError('Failed to save app settings to Supabase', normalized, 'saveAppData');
      if (data.apiKey !== undefined) {
        logError('Api key error', normalized, 'saveAppData');
      } else if (data.geminiApiKey !== undefined) {
        logError('Gemini api key error', normalized, 'saveAppData');
      } else {
        logError('App settings error', normalized, 'saveAppData');
      }
      throw error;
    }
    
    logSuccess('App settings saved to Supabase', result, 'saveAppData');
    if (data.apiKey !== undefined) {
      logSuccess('Api key update to supabase successfully', null, 'saveAppData');
    } else if (data.geminiApiKey !== undefined) {
      logSuccess('Gemini api key update to supabase successfully', null, 'saveAppData');
    } else {
      logSuccess('App settings update to supabase successfully', null, 'saveAppData');
    }

    // Also save to localStorage for faster initial loads
    const { apiKey, geminiApiKey, ...rest } = cachedAppData;
    localStorage.setItem('examforge_app_data', JSON.stringify(rest));
    if (data.apiKey !== undefined) {
      if (data.apiKey) {
        localStorage.setItem('examforge_openrouter_key', data.apiKey);
      } else {
        localStorage.removeItem('examforge_openrouter_key');
      }
      logInfo('API key saved to localStorage', null, 'saveAppData');
    }
    if (data.geminiApiKey !== undefined) {
      if (data.geminiApiKey) {
        localStorage.setItem('examforge_gemini_key', data.geminiApiKey);
      } else {
        localStorage.removeItem('examforge_gemini_key');
      }
      logInfo('Gemini API key saved to localStorage', null, 'saveAppData');
    }
    if (data.aiProvider !== undefined) {
      localStorage.setItem('examforge_ai_provider', data.aiProvider);
    }
  } catch (error) {
    const normalized = normalizeSupabaseError(error);
    logError('Error saving app data to Supabase', normalized, 'saveAppData');
    if (data.apiKey !== undefined) {
      logError('Api key error', normalized, 'saveAppData');
    } else if (data.geminiApiKey !== undefined) {
      logError('Gemini api key error', normalized, 'saveAppData');
    } else {
      logError('App settings error', normalized, 'saveAppData');
    }
    throw error;
  }
}

// Section management
export async function createSection(name: string): Promise<Section> {
  logInfo('Creating section', { name }, 'createSection');
  
  const section: Section = {
    id: generateUniqueId('section'),
    name,
    createdAt: new Date().toISOString(),
    savedDocuments: [],
    storedQuestions: [],
    testResults: [],
  };

  // Update cache immediately
  const data = getAppData();
  data.sections.push(section);
  data.activeSectionId = section.id;
  cachedAppData = data;

  try {
    const supabase = createClient();

    const sectionData = {
      id: section.id,
      name: section.name,
      created_at: section.createdAt,
    };
    
    logSupabase('Inserting section', sectionData, 'createSection');

    // Insert section into Supabase
    const { data: result, error } = await supabase
      .from('sections')
      .insert(sectionData)
      .select();
    
    if (error) {
      logError('Failed to insert section to Supabase', error, 'createSection');
      
      // Check if this is a schema cache error
      if (isSchemaCacheError(error)) {
        logWarn('Schema cache error detected - data will be saved locally only', null, 'createSection');
        // Don't throw - section is already in localStorage
      } else {
        throw error;
      }
    } else {
      logSuccess('Section inserted to Supabase', result, 'createSection');

      // Update active section
      const { error: settingsError } = await supabase
        .from('app_settings')
        .upsert({
          id: 1,
          active_section_id: section.id,
          updated_at: new Date().toISOString(),
        });
      
      if (settingsError) {
        logError('Failed to update active section in app_settings', settingsError, 'createSection');
      } else {
        logSuccess('Active section updated in app_settings', { sectionId: section.id }, 'createSection');
      }
    }

    // Save to localStorage
    const { apiKey, ...rest } = data;
    localStorage.setItem('examforge_app_data', JSON.stringify(rest));
    logInfo('Section saved to localStorage (fallback)', { sectionId: section.id }, 'createSection');
  } catch (error) {
    logError('Error creating section in Supabase', error, 'createSection');
  }

  logInfo('Section created successfully', { id: section.id, name: section.name }, 'createSection');
  return section;
}

export function getSection(sectionId: string): Section | undefined {
  const data = getAppData();
  return data.sections.find(s => s.id === sectionId);
}

export function getAllSections(): Section[] {
  return getAppData().sections;
}

export async function updateSection(sectionId: string, updates: Partial<Section>): Promise<void> {
  logInfo('Updating section', { sectionId, updates }, 'updateSection');
  
  const data = getAppData();
  const index = data.sections.findIndex(s => s.id === sectionId);
  
  if (index !== -1) {
    data.sections[index] = { ...data.sections[index], ...updates };
    cachedAppData = data;

    try {
      const supabase = createClient();

      // Update section in Supabase
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.pastedNotes !== undefined) dbUpdates.pasted_notes = updates.pastedNotes;

      if (Object.keys(dbUpdates).length > 0) {
        logSupabase('Updating section in Supabase', { sectionId, dbUpdates }, 'updateSection');
        
        const { error } = await supabase
          .from('sections')
          .update(dbUpdates)
          .eq('id', sectionId);
        
        if (error) {
          logError('Failed to update section in Supabase', error, 'updateSection');
        } else {
          logSuccess('Section updated in Supabase', { sectionId }, 'updateSection');
        }
      }

      // Save to localStorage
      const { apiKey, ...rest } = data;
      localStorage.setItem('examforge_app_data', JSON.stringify(rest));
    } catch (error) {
      logError('Error updating section in Supabase', error, 'updateSection');
    }
  }
}

export async function renameSection(sectionId: string, newName: string): Promise<void> {
  await updateSection(sectionId, { name: newName });
}

export async function deleteSection(sectionId: string): Promise<void> {
  const data = getAppData();
  data.sections = data.sections.filter(s => s.id !== sectionId);
  
  if (data.activeSectionId === sectionId) {
    data.activeSectionId = data.sections.length > 0 ? data.sections[0].id : null;
  }
  
  cachedAppData = data;

  try {
    const supabase = createClient();

    // Delete section (cascade will delete related data)
    await supabase
      .from('sections')
      .delete()
      .eq('id', sectionId);

    // Update active section if needed
    await supabase
      .from('app_settings')
      .upsert({
        id: 1,
        active_section_id: data.activeSectionId,
        updated_at: new Date().toISOString(),
      });

    // Save to localStorage
    const { apiKey, ...rest } = data;
    localStorage.setItem('examforge_app_data', JSON.stringify(rest));
  } catch (error) {
    console.error('Error deleting section from Supabase:', error);
  }
}

export async function setActiveSection(sectionId: string): Promise<void> {
  await saveAppData({ activeSectionId: sectionId });
}

// Generate unique ID using crypto.randomUUID if available, fallback to timestamp+random
function generateUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
}

// Document management within sections
export async function addDocumentToSection(sectionId: string, doc: Omit<SavedDocument, 'id' | 'uploadedAt'>): Promise<SavedDocument> {
  logInfo('Adding document to section', { sectionId, docName: doc.name, docSize: doc.size }, 'addDocumentToSection');
  
  const section = getSection(sectionId);
  if (!section) {
    logError('Section not found', { sectionId }, 'addDocumentToSection');
    throw new Error('Section not found');
  }

  const savedDoc: SavedDocument = {
    ...doc,
    id: generateUniqueId('doc'),
    uploadedAt: new Date().toISOString(),
  };

  section.savedDocuments.push(savedDoc);
  
  // Update cache
  const data = getAppData();
  const index = data.sections.findIndex(s => s.id === sectionId);
  if (index !== -1) {
    data.sections[index] = section;
    cachedAppData = data;
  }

  try {
    const supabase = createClient();

    const docData = {
      id: savedDoc.id,
      section_id: sectionId,
      name: savedDoc.name,
      content: savedDoc.content.substring(0, 100) + '...', // Log truncated
      size: savedDoc.size,
      uploaded_at: savedDoc.uploadedAt,
    };
    
    logSupabase('Inserting document to Supabase', { docData }, 'addDocumentToSection');

    // Insert document into Supabase
    const { data: result, error } = await supabase
      .from('saved_documents')
      .insert({
        id: savedDoc.id,
        section_id: sectionId,
        name: savedDoc.name,
        content: savedDoc.content,
        size: savedDoc.size,
        uploaded_at: savedDoc.uploadedAt,
      })
      .select();
    
    if (error) {
      logError('Failed to insert document to Supabase', error, 'addDocumentToSection');
      logError('Study meteriel', error, 'addDocumentToSection');
      throw error;
    }
    
    logSuccess('Document inserted to Supabase', result, 'addDocumentToSection');
    logSuccess('Study meteriel  update to supabase successfully', null, 'addDocumentToSection');

    // Save to localStorage
    const { apiKey, ...rest } = data;
    localStorage.setItem('examforge_app_data', JSON.stringify(rest));
    logInfo('Document saved to localStorage', { docId: savedDoc.id }, 'addDocumentToSection');
  } catch (error) {
    logError('Error adding document to Supabase', error, 'addDocumentToSection');
    logError('Study meteriel', error, 'addDocumentToSection');
  }

  logSuccess('Document added successfully', { id: savedDoc.id, name: savedDoc.name }, 'addDocumentToSection');
  return savedDoc;
}

export async function removeDocumentFromSection(sectionId: string, docId: string): Promise<void> {
  const section = getSection(sectionId);
  if (!section) return;

  section.savedDocuments = section.savedDocuments.filter(d => d.id !== docId);
  
  // Update cache
  const data = getAppData();
  const index = data.sections.findIndex(s => s.id === sectionId);
  if (index !== -1) {
    data.sections[index] = section;
    cachedAppData = data;
  }

  try {
    const supabase = createClient();

    // Delete document from Supabase
    const { error } = await supabase
      .from('saved_documents')
      .delete()
      .eq('id', docId);

    if (error) {
      logError('Study meteriel', error, 'removeDocumentFromSection');
    } else {
      logSuccess('Study meteriel  update to supabase successfully', { docId }, 'removeDocumentFromSection');
    }

    // Save to localStorage
    const { apiKey, ...rest } = data;
    localStorage.setItem('examforge_app_data', JSON.stringify(rest));
  } catch (error) {
    console.error('Error removing document from Supabase:', error);
    logError('Study meteriel', error, 'removeDocumentFromSection');
  }
}

export async function updateSectionNotes(sectionId: string, notes: string): Promise<void> {
  await updateSection(sectionId, { pastedNotes: notes });
}

// Test result management within sections
export async function saveTestResultToSection(sectionId: string, result: TestResult): Promise<void> {
  const section = getSection(sectionId);
  if (!section) return;

  // Add result
  section.testResults.unshift(result);
  
  // Keep only last 50 results per section
  if (section.testResults.length > 50) {
    section.testResults = section.testResults.slice(0, 50);
  }

  // Store questions for deduplication
  const newStoredQuestions: StoredQuestion[] = result.questions.map(q => ({
    questionHash: hashQuestion(q.question),
    questionText: q.question,
    topic: q.topic,
    dateUsed: result.date,
    testId: result.id,
  }));

  section.storedQuestions = [...newStoredQuestions, ...section.storedQuestions];
  
  // Keep only last 500 questions per section
  if (section.storedQuestions.length > 500) {
    section.storedQuestions = section.storedQuestions.slice(0, 500);
  }

  // Update cache
  const data = getAppData();
  const index = data.sections.findIndex(s => s.id === sectionId);
  if (index !== -1) {
    data.sections[index] = section;
    cachedAppData = data;
  }

  try {
    const supabase = createClient();

    // Insert test result into Supabase
    const { error: testInsertError } = await supabase
      .from('test_results')
      .insert({
        id: result.id,
        section_id: sectionId,
        name: result.name,
        date: result.date,
        config: result.config,
        questions: result.questions,
        answers: result.answers,
        score: result.score,
        total_questions: result.totalQuestions,
        time_taken: result.timeTaken,
      });
    
    if (testInsertError) {
      logError('Test error', testInsertError, 'saveTestResultToSection');
      throw testInsertError;
    } else {
      logSuccess('Test update to supabase successfully', { testId: result.id }, 'saveTestResultToSection');
    }

    // Insert stored questions into Supabase (best-effort)
    // Prefer writing test_id (after migration). If column doesn't exist, retry without it.
    for (const sq of newStoredQuestions) {
      const payloadWithTestId = {
        section_id: sectionId,
        test_id: result.id,
        question_hash: sq.questionHash,
        question_text: sq.questionText,
        topic: sq.topic,
        date_used: sq.dateUsed,
      };

      let { error: questionInsertError } = await supabase
        .from('stored_questions')
        .insert(payloadWithTestId);

      if (questionInsertError) {
        const msg = String(questionInsertError.message || '');
        const missingTestIdColumn = msg.includes('test_id') && (msg.includes('column') || msg.includes('does not exist'));
        if (missingTestIdColumn) {
          const { test_id, ...payloadWithoutTestId } = payloadWithTestId as any;
          ({ error: questionInsertError } = await supabase
            .from('stored_questions')
            .insert(payloadWithoutTestId));
        }
      }

      if (questionInsertError) {
        logError('Questions error', questionInsertError, 'saveTestResultToSection');
      }
    }

    // Save to localStorage
    const { apiKey, ...rest } = data;
    localStorage.setItem('examforge_app_data', JSON.stringify(rest));
  } catch (error) {
    console.error('Error saving test result to Supabase:', error);
    logError('Test error', error, 'saveTestResultToSection');
  }
}

// Update a test result in place (for retakes)
export async function updateTestResultInSection(sectionId: string, testId: string, updatedResult: TestResult): Promise<void> {
  const section = getSection(sectionId);
  if (!section) return;

  const testIndex = section.testResults.findIndex(t => t.id === testId);
  if (testIndex !== -1) {
    section.testResults[testIndex] = updatedResult;
    
    // Update cache
    const data = getAppData();
    const index = data.sections.findIndex(s => s.id === sectionId);
    if (index !== -1) {
      data.sections[index] = section;
      cachedAppData = data;
    }

    try {
      const supabase = createClient();

      // Update test result in Supabase
      const { error } = await supabase
        .from('test_results')
        .update({
          name: updatedResult.name,
          date: updatedResult.date,
          config: updatedResult.config,
          questions: updatedResult.questions,
          answers: updatedResult.answers,
          score: updatedResult.score,
          total_questions: updatedResult.totalQuestions,
          time_taken: updatedResult.timeTaken,
        })
        .eq('id', testId);
      
      if (error) {
        logError('Test error', error, 'updateTestResultInSection');
      } else {
        logSuccess('Test update to supabase successfully', { testId }, 'updateTestResultInSection');
      }

      // Save to localStorage
      const { apiKey, ...rest } = data;
      localStorage.setItem('examforge_app_data', JSON.stringify(rest));
    } catch (error) {
      console.error('Error updating test result in Supabase:', error);
      logError('Test error', error, 'updateTestResultInSection');
    }
  }
}

export async function renameTestResult(sectionId: string, testId: string, newName: string): Promise<void> {
  const section = getSection(sectionId);
  if (!section) return;

  const testIndex = section.testResults.findIndex(t => t.id === testId);
  if (testIndex !== -1) {
    section.testResults[testIndex].name = newName;
    
    // Update cache
    const data = getAppData();
    const index = data.sections.findIndex(s => s.id === sectionId);
    if (index !== -1) {
      data.sections[index] = section;
      cachedAppData = data;
    }

    try {
      const supabase = createClient();

      // Update test name in Supabase
      const { error } = await supabase
        .from('test_results')
        .update({ name: newName })
        .eq('id', testId);
      
      if (error) {
        logError('Test error', error, 'renameTestResult');
      } else {
        logSuccess('Test update to supabase successfully', { testId }, 'renameTestResult');
      }

      // Save to localStorage
      const { apiKey, ...rest } = data;
      localStorage.setItem('examforge_app_data', JSON.stringify(rest));
    } catch (error) {
      console.error('Error renaming test result in Supabase:', error);
      logError('Test error', error, 'renameTestResult');
    }
  }
}

export async function deleteTestResult(sectionId: string, testId: string): Promise<{ cloudDeleted: boolean; cloudError?: string }> {
  const section = getSection(sectionId);
  if (!section) return { cloudDeleted: false, cloudError: 'Section not found' };

  const testToDelete = section.testResults.find(t => t.id === testId);
  const hashesToDelete =
    testToDelete?.questions?.map(q => hashQuestion(q.question)) || [];

  section.testResults = section.testResults.filter(t => t.id !== testId);
  if (hashesToDelete.length > 0) {
    // Remove only questions that belong to this test (works best when testId is present)
    section.storedQuestions = section.storedQuestions.filter((sq) => {
      if ((sq as any).testId) return (sq as any).testId !== testId;
      // Backward-compat: try to match by (dateUsed + questionHash) for older rows
      if (testToDelete?.date && sq.dateUsed !== testToDelete.date) return true;
      return !hashesToDelete.includes(sq.questionHash);
    });
  }
  
  // Update cache
  const data = getAppData();
  const index = data.sections.findIndex(s => s.id === sectionId);
  if (index !== -1) {
    data.sections[index] = section;
    cachedAppData = data;
  }

  try {
    const supabase = createClient();

    // Delete test result from Supabase
    const { error } = await supabase
      .from('test_results')
      .delete()
      .eq('id', testId)
      .eq('section_id', sectionId);
    
    if (error) {
      logError('Test error', error, 'deleteTestResult');
      return { cloudDeleted: false, cloudError: error.message };
    } else {
      logSuccess('Test update to supabase successfully', { testId }, 'deleteTestResult');
    }

    // Also delete stored questions for this test (2 strategies):
    // 1) If schema has test_id column: delete by test_id
    // 2) Backward-compat: delete by (section_id + date_used + question_hash IN [...])
    if (hashesToDelete.length > 0 && testToDelete?.date) {
      // Strategy 1: delete by test_id (may fail if column missing)
      const { error: sqByTestIdError } = await supabase
        .from('stored_questions')
        .delete()
        .eq('section_id', sectionId)
        .eq('test_id', testId);

      if (sqByTestIdError) {
        const msg = String(sqByTestIdError.message || '');
        const missingTestIdColumn = msg.includes('test_id') && (msg.includes('column') || msg.includes('does not exist'));
        if (!missingTestIdColumn) {
          logError('Questions error', sqByTestIdError, 'deleteTestResult');
        }

        // Strategy 2: safe fallback for old schema/data
        const { error: sqFallbackError } = await supabase
          .from('stored_questions')
          .delete()
          .eq('section_id', sectionId)
          .eq('date_used', testToDelete.date)
          .in('question_hash', hashesToDelete);

        if (sqFallbackError) {
          logError('Questions error', sqFallbackError, 'deleteTestResult');
        }
      }
    }

    // Save to localStorage
    const { apiKey, ...rest } = data;
    localStorage.setItem('examforge_app_data', JSON.stringify(rest));
    return { cloudDeleted: true };
  } catch (error) {
    console.error('Error deleting test result from Supabase:', error);
    logError('Test error', error, 'deleteTestResult');
    return { cloudDeleted: false, cloudError: error instanceof Error ? error.message : String(error) };
  }
}

// Utility functions
export function hashQuestion(question: string): string {
  let hash = 0;
  const str = normalizeText(question);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' '));
  const words2 = new Set(normalizeText(text2).split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export function checkQuestionSimilarity(
  newQuestion: string,
  storedQuestions: StoredQuestion[],
  threshold: number = 0.6
): { isSimilar: boolean; similarity: number; similarTo?: string } {
  let maxSimilarity = 0;
  let mostSimilar: string | undefined;
  
  for (const stored of storedQuestions) {
    const similarity = calculateSimilarity(newQuestion, stored.questionText);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilar = stored.questionText;
    }
  }
  
  return {
    isSimilar: maxSimilarity >= threshold,
    similarity: maxSimilarity,
    similarTo: mostSimilar,
  };
}

export function generateSimilarityReportForSection(
  sectionId: string,
  newQuestions: string[],
  threshold: number = 0.6
): SimilarityReport {
  const section = getSection(sectionId);
  const storedQuestions = section?.storedQuestions || [];
  const flaggedQuestions: SimilarityReport['flaggedQuestions'] = [];
  
  for (const question of newQuestions) {
    const result = checkQuestionSimilarity(question, storedQuestions, threshold);
    if (result.isSimilar && result.similarTo) {
      flaggedQuestions.push({
        newQuestion: question,
        similarTo: result.similarTo,
        similarity: result.similarity,
      });
    }
  }
  
  return {
    totalNewQuestions: newQuestions.length,
    similarQuestions: flaggedQuestions.length,
    uniqueQuestions: newQuestions.length - flaggedQuestions.length,
    similarityPercentage: newQuestions.length > 0 
      ? Math.round((flaggedQuestions.length / newQuestions.length) * 100) 
      : 0,
    flaggedQuestions,
  };
}

// Stats for a section
export function getSectionStats(sectionId: string) {
  const section = getSection(sectionId);
  if (!section) {
    return { totalTests: 0, averageScore: 0, questionsStored: 0, documentsCount: 0 };
  }

  const totalTests = section.testResults.length;
  const averageScore = totalTests > 0 
    ? Math.round(section.testResults.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0) / totalTests)
    : 0;

  return {
    totalTests,
    averageScore,
    questionsStored: section.storedQuestions.length,
    documentsCount: section.savedDocuments.length,
  };
}

// Global stats
export function getGlobalStats() {
  const data = getAppData();
  
  let totalTests = 0;
  let totalScore = 0;
  let totalQuestions = 0;
  let totalDocuments = 0;

  for (const section of data.sections) {
    totalTests += section.testResults.length;
    totalDocuments += section.savedDocuments.length;
    totalQuestions += section.storedQuestions.length;
    
    for (const result of section.testResults) {
      totalScore += (result.score / result.totalQuestions) * 100;
    }
  }

  return {
    totalSections: data.sections.length,
    totalTests,
    averageScore: totalTests > 0 ? Math.round(totalScore / totalTests) : 0,
    totalQuestions,
    totalDocuments,
  };
}

// Clear all data for a section
export async function clearSectionData(sectionId: string): Promise<void> {
  const section = getSection(sectionId);
  if (!section) return;

  // Update cache
  const data = getAppData();
  const index = data.sections.findIndex(s => s.id === sectionId);
  if (index !== -1) {
    data.sections[index] = {
      ...section,
      savedDocuments: [],
      storedQuestions: [],
      testResults: [],
      pastedNotes: '',
    };
    cachedAppData = data;
  }

  try {
    const supabase = createClient();

    // Delete all related data (documents, questions, results)
    await supabase.from('saved_documents').delete().eq('section_id', sectionId);
    await supabase.from('stored_questions').delete().eq('section_id', sectionId);
    await supabase.from('test_results').delete().eq('section_id', sectionId);

    // Update section notes
    await supabase
      .from('sections')
      .update({ pasted_notes: '' })
      .eq('id', sectionId);

    // Save to localStorage
    const { apiKey, ...rest } = data;
    localStorage.setItem('examforge_app_data', JSON.stringify(rest));
  } catch (error) {
    console.error('Error clearing section data from Supabase:', error);
  }
}

// Check if data is initialized from Supabase
export function isDataInitialized(): boolean {
  return isInitialized;
}

// Force refresh from Supabase
export async function refreshFromSupabase(): Promise<AppData> {
  cachedAppData = null;
  isInitialized = false;
  return await initializeFromSupabase();
}
