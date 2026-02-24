
/*
    ========================================================================
    BACKEND SERVICE: SUPABASE (CLOUD)
    ========================================================================
*/

import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAZIONE SUPABASE ---
const SUPABASE_URL = "https://jkkhlibudlvvzvzzloqk.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impra2hsaWJ1ZGx2dnp2enpsb3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzkxNzksImV4cCI6MjA4Mjk1NTE3OX0.GpmyhbrQuVo_QpVQLdM754a7wevEAHH2e4Pp-XwoJ8U";

// Verifica configurazione
const hasSupabase = SUPABASE_URL.startsWith('https') && SUPABASE_KEY.length > 20;

// Initialize Client
let supabaseClient = null;
if (hasSupabase) {
    try {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: true, // Mantiene il login tra ricaricamenti
                autoRefreshToken: true,
            }
        });
        console.log("✅ Kairòs connected to Supabase Cloud");
    } catch (e) {
        console.error("❌ Failed to initialize Supabase:", e);
    }
}

export const supabase = supabaseClient;
export const isCloudEnabled = !!supabaseClient; 

// --- AUTH & USER UTILS ---

const formatSupabaseUser = (user: any) => ({
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
    photoURL: user.user_metadata?.avatar_url || null,
    isNewUser: false, // Gestito dal componente di login
    lastLogin: new Date().toISOString()
});

export const subscribeToAuthChanges = (callback: (user: any) => void) => {
    if (!supabase) {
        callback(null);
        return () => {};
    }

    // Check sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            callback(formatSupabaseUser(session.user));
        } else {
            callback(null);
        }
    });

    // Ascolta cambiamenti (Login/Logout su altri tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            callback(formatSupabaseUser(session.user));
        } else {
            callback(null);
        }
    });
    
    return () => subscription.unsubscribe();
};

// --- AUTH ACTIONS (CLOUD ONLY PREFERRED) ---

export const loginWithEmail = async (email: string, pass: string) => {
    if (!supabase) throw new Error("Database Cloud non connesso.");
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
    });
    
    if (error) throw new Error(error.message);
    return formatSupabaseUser(data.user);
};

export const registerWithEmail = async (name: string, email: string, pass: string, _q?: string, _a?: string) => {
    if (!supabase) throw new Error("Database Cloud non connesso.");

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: pass,
        options: {
            data: {
                full_name: name,
            },
        },
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Errore creazione utente.");

    return { ...formatSupabaseUser(data.user), isNewUser: true };
};

export const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('kairos_user_session'); // Pulisci eventuali residui locali
};

// --- DATA SYNC (CLOUD FIRST) ---

export const saveUserData = async (uid: string, data: any) => {
    // LOCAL GUEST HANDLING
    if (uid.startsWith('local-guest-')) {
        try {
            localStorage.setItem(`kairos_local_data_${uid}`, JSON.stringify(data));
            console.log("✅ Local Data Saved");
        } catch (e) {
            console.error("Local Save Error:", e);
        }
        return;
    }

    if (!supabase) return; // Non salvare nulla se non c'è il cloud

    try {
        // Upsert into user_data table
        const { error } = await supabase
            .from('user_data')
            .upsert({ id: uid, content: data });
        
        if (error) console.error("Cloud Save Error:", error);
    } catch (e) {
        console.error("Sync Error:", e);
    }
};

export const subscribeToUserData = (uid: string, callback: (data: any) => void) => {
    // LOCAL GUEST HANDLING
    if (uid.startsWith('local-guest-')) {
        const localData = localStorage.getItem(`kairos_local_data_${uid}`);
        if (localData) {
            try {
                callback(JSON.parse(localData));
            } catch (e) {
                console.error("Local Load Error", e);
            }
        }
        return () => {};
    }

    if (!supabase) return () => {};

    // 1. Carica subito i dati dal Cloud
    supabase
        .from('user_data')
        .select('content')
        .eq('id', uid)
        .single()
        .then(({ data, error }) => {
            if (data?.content) {
                callback(data.content);
            }
        })
        .catch(err => console.error("Data fetch error", err));

    // 2. Opzionale: Realtime (se abilitato su Supabase)
    // Per ora ci affidiamo al fetch iniziale per stabilità
    return () => {};
};

// --- SYSTEM UTILS ---

export const checkCloudSyncStatus = async (uid: string): Promise<string> => {
    if (uid.startsWith('local-guest-')) return "Modalità Locale (Offline)";
    if (!supabase) return "Modalità Offline (No Cloud)";

    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('updated_at')
            .eq('id', uid)
            .single();

        if (error) return "Sincronizzazione in attesa...";
        if (data) return `✅ Cloud Attivo. Ultimo sync: ${new Date(data.updated_at).toLocaleTimeString()}`;
        return "Connesso.";
    } catch (e) {
        return "Errore verifica.";
    }
};

// --- ADMIN MOCKS (Per compatibilità UI) ---
export const getLocalUser = () => {
    try {
        const user = localStorage.getItem('kairos_local_user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
};
export const getSecurityQuestion = () => ""; 
export const resetPasswordWithSecurityAnswer = async () => false;
export const updateUserSecurity = async (uid: string, updates: any) => {};
export const getAllLocalUsers = () => [];
export const deleteLocalUser = (uid: string) => {};
export const getSystemStats = () => ({ userCount: 1, totalTasks: 0, totalEvents: 0, totalTransactions: 0 });
export const nukeSystem = () => {};
export const getSystemLogs = () => [];
export const addSystemLog = () => {};
export const clearSystemCache = () => {};
export const getGlobalConfig = () => ({ maintenanceMode: false, globalAnnouncement: '' });
export const updateGlobalConfig = (config: any) => {};
export const getAllReports = () => [];
export const submitReport = (uid: string, name: string, type: string, desc: string) => {};
export const deleteReport = (id: string) => {};
