
import { GoogleGenAI, Type } from "@google/genai";
import { Task, FixedEvent, AiScheduleResponse, Goal, UploadedFile, GlobalExtractionResponse, EventCategory, NutritionalInfo, WorkoutInfo, StudyInfo, GoalPlanResponse, DietPlanResponse, WorkoutPlanResponse, StudyPlanResponse, RoutinePlanResponse, BudgetPlanResponse, Transaction } from "../types";

// --- CONFIGURAZIONE SVILUPPO ---
// INCOLLA QUI LA TUA API KEY TRA LE VIRGOLETTE PER NON DOVERLA INSERIRE OGNI VOLTA
export const DEV_API_KEY = "AIzaSyDJ3HMrmt60D3FLJ_AXDEhHAmFS56ZcyEs"; 

// Helper to get the AI instance dynamically
const getAI = () => {
    const storedKey = localStorage.getItem('gemini_api_key');
    
    // Safely access process.env
    let envKey = undefined;
    try {
        if (typeof process !== 'undefined' && process.env) {
            envKey = process.env.API_KEY;
        }
    } catch (e) {
        // Ignore process error
    }

    // Ordine di priorità: 
    // 1. Chiave salvata nel browser
    // 2. Chiave scritta qui nel codice (DEV_API_KEY)
    // 3. Variabile d'ambiente
    const apiKey = storedKey || DEV_API_KEY || envKey;
    
    if (!apiKey) {
        throw new Error("API Key mancante. Inseriscila nelle impostazioni del profilo o nel codice.");
    }
    return new GoogleGenAI({ apiKey });
};

// Helper to prepare parts
const prepareFileParts = (files: UploadedFile[]) => {
    return files.map(f => ({
        inlineData: {
            mimeType: f.mimeType,
            data: f.data
        }
    }));
};

/**
 * NEW: Interpret natural language input to create tasks or events instantly
 */
export const parseNaturalLanguageAction = async (input: string, referenceDate: string): Promise<any> => {
    try {
        const ai = getAI();
        const prompt = `
            Sei un assistente personale ultra-veloce.
            Analizza l'input dell'utente: "${input}"
            Data di riferimento (Oggi): ${referenceDate}
            
            Determina se l'utente vuole creare un 'event' (ha un orario specifico o è un appuntamento) o un 'task' (qualcosa da fare senza orario fisso o flessibile).
            
            Restituisci un oggetto JSON con:
            - actionType: 'event' | 'task'
            - title: Titolo pulito dell'attività
            - category: 'work' | 'personal' | 'meal' | 'workout' | 'study' | 'generic'
            - date: YYYY-MM-DD (Calcola la data corretta basandoti su "domani", "lunedì prossimo", ecc. Se non specificata, usa oggi).
            - startTime: HH:MM (Solo se specificato o deducibile, es "alle 18").
            - endTime: HH:MM (Stima 1 ora dopo se non specificato per eventi).
            - durationMinutes: number (Stima durata in minuti).
            - details: Eventuali dettagli extra.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        actionType: { type: Type.STRING, enum: ["event", "task"] },
                        title: { type: Type.STRING },
                        category: { type: Type.STRING, enum: ["work", "personal", "meal", "workout", "study", "generic"] },
                        date: { type: Type.STRING, description: "YYYY-MM-DD" },
                        startTime: { type: Type.STRING, description: "HH:MM format" },
                        endTime: { type: Type.STRING, description: "HH:MM format" },
                        durationMinutes: { type: Type.NUMBER },
                        details: { type: Type.STRING }
                    },
                    required: ["actionType", "title", "category", "date"]
                }
            }
        });

        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
    } catch (e) {
        console.error("Natural language parse error", e);
        return null;
    }
};

/**
 * Generate simple text steps for a goal (Used in GoalInput component)
 */
export const generateGoalSteps = async (goalTitle: string, goalDescription: string): Promise<string[]> => {
    try {
        const ai = getAI();
        const prompt = `
            Agisci come un life coach esperto.
            Obiettivo: "${goalTitle}".
            Contesto: "${goalDescription}".
            Genera una lista di 3-6 milestone (step) concrete per raggiungere questo obiettivo.
            Restituisci SOLO un array JSON di stringhe. Esempio: ["Step 1", "Step 2"]
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (e) {
        console.error("Goal steps generation error", e);
        return [];
    }
};

/**
 * Search places using Google Maps Grounding
 */
export const searchPlaces = async (query: string, userLocation?: { lat: number; lng: number }): Promise<{ name: string; address?: string }[]> => {
    if (!query || query.length < 3) return [];

    try {
        const ai = getAI();
        const config: any = {
            tools: [{ googleMaps: {} }],
        };

        // Add location bias if available
        if (userLocation) {
            config.toolConfig = {
                retrievalConfig: {
                    latLng: {
                        latitude: userLocation.lat,
                        longitude: userLocation.lng
                    }
                }
            };
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: `Find 5 specific real-world locations matching "${query}". 
            Important: The user wants to know exactly WHICH branch or location. 
            Return distinct place names that include the city or neighborhood in the title (e.g. "GymName, Milano" instead of just "GymName").`,
            config: config,
        });

        // Extract grounding chunks which contain the actual Maps data
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (!chunks || chunks.length === 0) return [];

        // Filter and map relevant chunks
        const places = chunks
            .filter((chunk: any) => chunk.web?.title || chunk.maps?.title) // Handle both web and maps chunks
            .map((chunk: any) => {
                // Prefer Maps data
                const title = chunk.maps?.title || chunk.web?.title;
                return {
                    name: title,
                    address: chunk.maps?.placeAnswerSources?.[0]?.placeId ? "Verificato su Maps" : undefined 
                };
            });

        // Deduplicate by name
        const uniquePlaces = places.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.name === v.name) === i);
        
        return uniquePlaces.slice(0, 5); // Return top 5
    } catch (error) {
        console.error("Place search error:", error);
        return [];
    }
};

/**
 * Estimate nutrition from text description AND files
 */
export const calculateNutrition = async (foodDescription: string, files: UploadedFile[] = []): Promise<NutritionalInfo> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);
        parts.push({
            text: `Analizza questo pasto (descrizione: "${foodDescription}") e le eventuali immagini allegate.
            Stima i valori nutrizionali totali.
            
            IMPORTANTE:
            - Se mancano le quantità esatte, usa porzioni standard medie.
            - NON RESTITUIRE ZERO. Devi sempre fornire una stima numerica realistica per calorie, proteine, carbo e grassi.
            
            Restituisci JSON.`
        });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        calories: { type: Type.NUMBER },
                        protein: { type: Type.NUMBER },
                        carbs: { type: Type.NUMBER },
                        fats: { type: Type.NUMBER }
                    },
                    required: ["calories", "protein", "carbs", "fats"]
                }
            }
        });

        const text = response.text;
        if (!text) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
        return JSON.parse(text) as NutritionalInfo;
    } catch (e) {
        console.error("Nutrition calculation error", e);
        return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
};

/**
 * Analyze a full diet plan file to extract goals and WEEKLY meals
 */
export const analyzeDietPlan = async (files: UploadedFile[]): Promise<DietPlanResponse> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);
        
        parts.push({
            text: `Analizza il piano nutrizionale allegato (PDF/Immagine).
            
            1. OBIETTIVI GLOBALI: Estrai gli obiettivi giornalieri totali (Calorie, Macro, Acqua).
               - Se non sono scritti esplicitamente, CALCOLALI sommando la media dei pasti giornalieri presenti.
            
            2. PROGRAMMA SETTIMANALE: Estrai la dieta completa per TUTTI i giorni presenti.
               - Mappa ogni giorno al 'dayIndex' corretto (0=Domenica, 1=Lunedì, ..., 6=Sabato).
               - Se la dieta è generica (es. "Giorno 1"), assumi Lunedì=1, ecc.
               
            *** ISTRUZIONI CRITICHE PER I VALORI NUTRIZIONALI ***
            - Per ogni pasto (Colazione, Pranzo, Cena, Snack), DEVI fornire Calorie, Proteine, Carbo e Grassi.
            - SE NON SONO SCRITTI NEL DOCUMENTO: CALCOLALI E STIMALI TU basandoti sugli ingredienti e le quantità indicate (es. "100g Riso" = ~360 kcal).
            - NON RESTITUIRE MAI 0 SE C'È DEL CIBO ELENCATO. Fai una stima precisa.
               
            Restituisci JSON.`
        });

        const response = await ai.models.generateContent({
            // SWITCHED TO 2.5 FLASH FOR RELIABLE JSON PARSING ON LARGE FILES
            model: "gemini-2.5-flash",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        goals: {
                            type: Type.OBJECT,
                            properties: {
                                calories: { type: Type.NUMBER },
                                protein: { type: Type.NUMBER },
                                carbs: { type: Type.NUMBER },
                                fats: { type: Type.NUMBER },
                                water: { type: Type.NUMBER }
                            },
                            required: ["calories", "protein", "carbs", "fats"]
                        },
                        weeklySchedule: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    dayIndex: { type: Type.INTEGER, description: "0=Sun, 1=Mon... 6=Sat" },
                                    meals: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                title: { type: Type.STRING },
                                                type: { type: Type.STRING, enum: ["Colazione", "Pranzo", "Cena", "Snack"] },
                                                details: { type: Type.STRING, description: "Lista ingredienti e quantità" },
                                                calories: { type: Type.NUMBER },
                                                protein: { type: Type.NUMBER },
                                                carbs: { type: Type.NUMBER },
                                                fats: { type: Type.NUMBER },
                                                suggestedTime: { type: Type.STRING, description: "HH:MM" }
                                            },
                                            required: ["title", "type", "details", "calories", "protein", "carbs", "fats", "suggestedTime"]
                                        }
                                    }
                                },
                                required: ["dayIndex", "meals"]
                            }
                        }
                    },
                    required: ["goals", "weeklySchedule"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text) as DietPlanResponse;
    } catch (e) {
        console.error("Diet plan analysis error", e);
        // Fallback default
        return {
            goals: { calories: 2000, protein: 150, carbs: 200, fats: 60, water: 8 },
            weeklySchedule: []
        };
    }
};

/**
 * Estimate workout details from text AND files
 */
export const calculateWorkoutDetails = async (workoutDescription: string, files: UploadedFile[] = []): Promise<WorkoutInfo> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);
        parts.push({
            text: `Analizza questa sessione di allenamento (descrizione: "${workoutDescription}") e le eventuali immagini/schede allegate.
            Estrai la lista esercizi, stima le calorie bruciate per una persona media (60 min se non specificato), l'intensità e il gruppo muscolare principale.
            Se l'utente scrive solo "Palestra" e non ci sono file, inventa una scheda bilanciata Full Body standard.
            Restituisci JSON.`
        });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        muscleGroup: { type: Type.STRING, description: "Es: Petto, Gambe, Cardio, Full Body" },
                        intensity: { type: Type.STRING, enum: ["Bassa", "Media", "Alta"] },
                        estimatedCalories: { type: Type.NUMBER },
                        exercises: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    sets: { type: Type.STRING, description: "Es: 4" },
                                    reps: { type: Type.STRING, description: "Es: 10-12" },
                                    weight: { type: Type.STRING, description: "Opzionale es: 20kg" }
                                },
                                required: ["name", "sets", "reps"]
                            }
                        }
                    },
                    required: ["muscleGroup", "intensity", "estimatedCalories", "exercises"]
                }
            }
        });

        const text = response.text;
        if (!text) return { muscleGroup: 'Generico', intensity: 'Media', estimatedCalories: 300, exercises: [] };
        return JSON.parse(text) as WorkoutInfo;
    } catch (e) {
        console.error("Workout calculation error", e);
        return { muscleGroup: 'Generico', intensity: 'Media', estimatedCalories: 0, exercises: [] };
    }
};

/**
 * Analyze a full workout plan file to extract goals and WEEKLY schedule
 */
export const analyzeWorkoutPlan = async (files: UploadedFile[]): Promise<WorkoutPlanResponse> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);

        parts.push({
            text: `Analizza la scheda di allenamento allegata (PDF/Immagine).
            
            1. OBIETTIVI: Stima obiettivi settimanali.
            2. PROGRAMMA SETTIMANALE: Estrai la routine completa per la settimana.
               - IMPORTANTE: Se la scheda è divisa in "Giorno A / Giorno B", crea un programma ricorrente realistico (es. Giorno A = Lunedì e Giovedì (1,4), Giorno B = Martedì e Venerdì (2,5)).
               - Mappa ogni allenamento al 'dayIndex' corretto (0=Domenica, 1=Lunedì, ..., 6=Sabato).
               - Se ci sono giorni espliciti (LUN, MAR), usa quelli.
               - Restituisci una lista di giorni con i relativi esercizi.

            Restituisci JSON.`
        });

        const response = await ai.models.generateContent({
            // SWITCHED TO 2.5 FLASH FOR RELIABLE JSON PARSING ON LARGE FILES
            model: "gemini-2.5-flash",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        goals: {
                            type: Type.OBJECT,
                            properties: {
                                workoutsPerWeek: { type: Type.NUMBER },
                                activeMinutesPerDay: { type: Type.NUMBER },
                                dailyCaloriesBurnGoal: { type: Type.NUMBER }
                            },
                            required: ["workoutsPerWeek", "activeMinutesPerDay", "dailyCaloriesBurnGoal"]
                        },
                        weeklySchedule: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    dayIndex: { type: Type.INTEGER, description: "0=Sun, 1=Mon... 6=Sat" },
                                    title: { type: Type.STRING },
                                    muscleGroup: { type: Type.STRING },
                                    durationMinutes: { type: Type.NUMBER },
                                    intensity: { type: Type.STRING, enum: ["Bassa", "Media", "Alta"] },
                                    exercises: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                name: { type: Type.STRING },
                                                sets: { type: Type.STRING },
                                                reps: { type: Type.STRING },
                                                weight: { type: Type.STRING }
                                            },
                                            required: ["name", "sets", "reps"]
                                        }
                                    }
                                },
                                required: ["dayIndex", "title", "muscleGroup", "exercises"]
                            }
                        }
                    },
                    required: ["goals", "weeklySchedule"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as WorkoutPlanResponse;

    } catch (e) {
        console.error("Workout plan analysis error", e);
        return {
            goals: { workoutsPerWeek: 4, activeMinutesPerDay: 60, dailyCaloriesBurnGoal: 500 },
            weeklySchedule: []
        };
    }
};

/**
 * Plan a study session from text AND files
 */
export const calculateStudySession = async (studyInput: string, files: UploadedFile[] = []): Promise<StudyInfo> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);
        parts.push({
            text: `Analizza questa sessione di studio (input: "${studyInput}") e i materiali allegati.
            Identifica la Materia, l'Argomento specifico e suggerisci il metodo di studio migliore tra (Pomodoro, Deep Work, Lettura, Ripasso, Esercizi).
            Elenca 3-5 concetti chiave o obiettivi specifici da raggiungere in questa sessione basandoti sul contenuto.
            Restituisci JSON.`
        });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING, description: "Materia (es. Matematica)" },
                        topic: { type: Type.STRING, description: "Argomento (es. Derivate)" },
                        method: { type: Type.STRING, enum: ["Pomodoro", "Deep Work", "Lettura", "Ripasso", "Esercizi"] },
                        keyConcepts: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Concetti chiave da studiare"
                        }
                    },
                    required: ["subject", "topic", "method", "keyConcepts"]
                }
            }
        });

        const text = response.text;
        if (!text) return { subject: 'Generico', topic: studyInput, method: 'Pomodoro', keyConcepts: [] };
        return JSON.parse(text) as StudyInfo;
    } catch (e) {
        console.error("Study calculation error", e);
        return { subject: 'Generico', topic: studyInput, method: 'Pomodoro', keyConcepts: [] };
    }
};

/**
 * Analyze a full study plan (e.g., Exam Calendar, Syllabus)
 */
export const analyzeStudyPlan = async (files: UploadedFile[]): Promise<StudyPlanResponse> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);
        const dayOfWeek = new Date().toLocaleDateString('it-IT', { weekday: 'long' });

        parts.push({
            text: `Analizza il piano di studi/calendario esami allegato.
            
            1. OBIETTIVI: Stima quante ore al giorno sarebbero ideali e quante sessioni a settimana.
            2. STUDIO DI OGGI: Cosa dovrei studiare oggi (${dayOfWeek}) in base al piano?
               Se non c'è una data specifica, suggerisci la prossima priorità logica o "Sessione 1".
               Suggerisci argomenti specifici.
               
            Restituisci JSON.`
        });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        goals: {
                            type: Type.OBJECT,
                            properties: {
                                dailyStudyHours: { type: Type.NUMBER },
                                sessionsPerWeek: { type: Type.NUMBER }
                            },
                            required: ["dailyStudyHours", "sessionsPerWeek"]
                        },
                        todaysSessions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    subject: { type: Type.STRING },
                                    topic: { type: Type.STRING },
                                    method: { type: Type.STRING, enum: ["Pomodoro", "Deep Work", "Lettura", "Ripasso", "Esercizi"] },
                                    durationMinutes: { type: Type.NUMBER },
                                    suggestedTime: { type: Type.STRING, description: "HH:MM" },
                                    keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["subject", "topic", "method", "durationMinutes", "keyConcepts"]
                            }
                        }
                    },
                    required: ["goals", "todaysSessions"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as StudyPlanResponse;
    } catch (e) {
        console.error("Study plan analysis error", e);
        return {
            goals: { dailyStudyHours: 4, sessionsPerWeek: 5 },
            todaysSessions: []
        };
    }
};

/**
 * Analyze a routine plan or habits list
 */
export const analyzeRoutinePlan = async (files: UploadedFile[]): Promise<RoutinePlanResponse> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);
        
        parts.push({
            text: `Analizza il documento di routine/abitudini allegato.
            
            1. OBIETTIVI: Stima quante abitudini giornaliere ci sono, minuti di focus e ore di sonno ideali.
            2. ABITUDINI DI OGGI: Estrai la lista di abitudini da fare oggi.
               Classificale per momento della giornata (morning, afternoon, evening).
               Se è un'azione specifica con orario (es. "Sveglia 7:00"), mettila come 'fixed'.
               Se è generica (es. "Leggere 10 pag"), mettila come 'flexible'.
               
            Restituisci JSON.`
        });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        goals: {
                            type: Type.OBJECT,
                            properties: {
                                habitsToComplete: { type: Type.NUMBER },
                                focusMinutes: { type: Type.NUMBER },
                                sleepHours: { type: Type.NUMBER }
                            },
                            required: ["habitsToComplete", "focusMinutes", "sleepHours"]
                        },
                        habits: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ["fixed", "flexible"] },
                                    timeOfDay: { type: Type.STRING, enum: ["morning", "afternoon", "evening"] },
                                    startTime: { type: Type.STRING, description: "HH:MM opzionale" },
                                    durationMinutes: { type: Type.NUMBER },
                                    details: { type: Type.STRING }
                                },
                                required: ["title", "type", "timeOfDay", "durationMinutes"]
                            }
                        }
                    },
                    required: ["goals", "habits"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as RoutinePlanResponse;
    } catch (e) {
        console.error("Routine plan analysis error", e);
        return {
            goals: { habitsToComplete: 5, focusMinutes: 60, sleepHours: 7.5 },
            habits: []
        };
    }
};

/**
 * Analyze a receipt image
 */
export const analyzeReceipt = async (files: UploadedFile[]): Promise<Partial<Transaction>> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);
        parts.push({
            text: `Analizza questo scontrino/fattura/nota spese.
            Estrai:
            1. Importo totale (numero).
            2. Categoria (Housing, Food, Transport, Leisure, Shopping, Health, Services, Other).
            3. Data (YYYY-MM-DD) se presente, altrimenti null.
            4. Descrizione breve (Nome esercente o prodotti principali).
            Restituisci JSON.`
        });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        amount: { type: Type.NUMBER },
                        category: { type: Type.STRING, enum: ['Housing', 'Food', 'Transport', 'Leisure', 'Shopping', 'Health', 'Services', 'Other'] },
                        date: { type: Type.STRING, description: "YYYY-MM-DD" },
                        description: { type: Type.STRING }
                    },
                    required: ["amount", "category", "description"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as Partial<Transaction>;
    } catch (e) {
        console.error("Receipt analysis error", e);
        return { amount: 0, category: 'Other', description: 'Errore analisi scontrino' };
    }
};

/**
 * Import a full budget plan
 */
export const analyzeBudgetPlan = async (files: UploadedFile[]): Promise<BudgetPlanResponse> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);
        parts.push({
            text: `Analizza questo documento finanziario (estratto conto, file budget, excel).
            
            1. Estrai il budget mensile consigliato o totale entrate (stima se non c'è).
            2. Estrai eventuali transazioni/spese ricorrenti presenti.
            
            Restituisci JSON.`
        });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        monthlyBudget: { type: Type.NUMBER },
                        savingsGoal: { type: Type.NUMBER },
                        detectedTransactions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    date: { type: Type.STRING },
                                    amount: { type: Type.NUMBER },
                                    type: { type: Type.STRING, enum: ['income', 'expense'] },
                                    category: { type: Type.STRING, enum: ['Housing', 'Food', 'Transport', 'Leisure', 'Shopping', 'Health', 'Services', 'Investments', 'Income', 'Other'] },
                                    description: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    required: ["monthlyBudget", "detectedTransactions"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as BudgetPlanResponse;
    } catch (e) {
        console.error("Budget plan analysis error", e);
        return { monthlyBudget: 2000, savingsGoal: 200, detectedTransactions: [] };
    }
};

/**
 * PHASE 1: Analyze files to find events across ANY date.
 */
export const extractGlobalEventsFromFiles = async (
    files: UploadedFile[],
    referenceDate: string // Today's date to calculate relative dates like "tomorrow"
): Promise<GlobalExtractionResponse> => {
    
    if (files.length === 0) return { extractedEvents: [] };

    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);

        const promptText = `
        Sei un assistente personale intelligente.
        Analizza TUTTI i file allegati (es. programmi di dieta, calendari lezioni, scadenze progetti, routine palestra).
        
        DATA DI RIFERIMENTO (OGGI): ${referenceDate}.
        
        OBIETTIVO:
        Estrai TUTTI gli eventi, compiti o appuntamenti trovati in tutti i file.
        
        IMPORTANTE PER IL CAMPO 'details':
        - Se è una DIETA: Nel campo 'details' scrivi ESPLICITAMENTE il menu (es. "100g Riso, 150g Pollo, Verdure").
        - Se è un ALLENAMENTO: Nel campo 'details' scrivi la LISTA DEGLI ESERCIZI (es. "Panca Piana 4x8, Croci 3x12...").
        - Sii sintetico e schematico.
        - Se trovi un LUOGO (es. "Palestra Virgin", "Ufficio Milano"), estrailo nel campo 'location'.

        Output JSON richiesto:
        Un oggetto contenente una lista 'extractedEvents'.
        `;

        parts.push({ text: promptText });

        const response = await ai.models.generateContent({
            // SWITCHED TO 2.5 FLASH TO PREVENT FREEZE ON COMPLEX EXTRACTION
            model: "gemini-2.5-flash",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        extractedEvents: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    date: { type: Type.STRING, description: "YYYY-MM-DD" },
                                    title: { type: Type.STRING },
                                    startTime: { type: Type.STRING, description: "HH:MM (opzionale)" },
                                    endTime: { type: Type.STRING, description: "HH:MM (opzionale)" },
                                    type: { type: Type.STRING, enum: ["fixed", "task"] },
                                    details: { type: Type.STRING, description: "Lista pratica di cosa fare/mangiare" },
                                    category: { type: Type.STRING, enum: ["generic", "meal", "workout", "work", "study", "personal"], description: "Infer from content" },
                                    estimatedMinutes: { type: Type.NUMBER, description: "If task, duration in min" },
                                    location: { type: Type.STRING, description: "Luogo dell'evento se presente" }
                                },
                                required: ["date", "title", "type"]
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return { extractedEvents: [] };
        return JSON.parse(text.replace(/```json|```/g, '').trim()) as GlobalExtractionResponse;

    } catch (error) {
        console.error("Global Extraction Error:", error);
        return { extractedEvents: [] }; // Fail gracefully
    }
};

/**
 * NEW: Analyze specific attachments to extract details on demand
 */
export const analyzeAttachmentContent = async (
    files: UploadedFile[], 
    title: string, 
    category: EventCategory,
    dateContext: string
): Promise<string> => {
    if (files.length === 0) return "Nessun file allegato.";

    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(files);
        
        const promptText = `
        Analizza i documenti allegati specificamente per l'attività: "${title}" (Categoria: ${category}).
        CONTESTO TEMPORALE: ${dateContext}.
        
        OBIETTIVO:
        Voglio una lista PRATICA e DIRETTA di cosa devo fare/mangiare *SOLO* per questo specifico giorno.
        Cerca le informazioni pertinenti in TUTTI i file allegati.
        
        ISTRUZIONI CRITICHE DI FILTRAGGIO:
        1. Se il documento è un calendario settimanale:
        - Identifica la sezione corrispondente a "${dateContext}".
        - IGNORA ASSOLUTAMENTE i giorni diversi da oggi.
        2. Se non trovi il giorno specifico, cerca l'attività "${title}" generica.
        
        REGOLE PER L'OUTPUT:
        - Se Categoria è 'meal' (Cibo): Elenca SOLO gli ingredienti e le grammature.
        - Se Categoria è 'workout' (Sport): Elenca SOLO gli esercizi.
        - Scrivi direttamente la lista senza preamboli.
        `;

        parts.push({ text: promptText });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: parts },
            config: {
                responseMimeType: "text/plain", 
            }
        });

        return response.text || "Impossibile estrarre dettagli per questo giorno.";
    } catch (error) {
        console.error("Analysis Error:", error);
        return "Errore durante l'analisi dei file.";
    }
}

/**
 * Generate a recurring action plan based on a Goal
 */
export const generateGoalPlan = async (goal: Goal): Promise<GoalPlanResponse> => {
    try {
        const ai = getAI();
        const parts: any[] = prepareFileParts(goal.attachments);
        
        const promptText = `
        Ho un obiettivo importante: "${goal.title}".
        Scadenza: ${goal.targetDate}.
        Descrizione: ${goal.description}.
        Milestones (Step): ${goal.steps.map(s => s.title).join(', ')}.
        
        AGISCI COME UN COACH DI PRODUTTIVITÀ.
        Crea un piano di azione concreto per raggiungere questo obiettivo entro la scadenza.
        
        Genera una lista di ATTIVITÀ RICORRENTI o SINGOLE da inserire nell'agenda.
        - Se è un obiettivo fisico (es. Maratona), pianifica allenamenti (es. 3 volte a settimana).
        - Se è di studio, pianifica sessioni di studio.
        - Se è un progetto, pianifica blocchi di lavoro.
        
        Per ogni attività:
        1. Definisci se è un 'task' (flessibile) o 'fixed' (orario fisso necessario).
        2. Definisci la 'recurrence' (0=Domenica, 1=Lunedì... 6=Sabato). Se vuoto, è un task singolo da fare asap.
        3. Categorizza correttamente (workout, study, work, personal).
        
        Restituisci JSON.
        `;

        parts.push({ text: promptText });

        const response = await ai.models.generateContent({
            // SWITCHED TO 2.5 FLASH TO PREVENT FREEZING ON PLAN GENERATION
            model: "gemini-2.5-flash",
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        plannedActivities: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    category: { type: Type.STRING, enum: ["generic", "meal", "workout", "work", "study", "personal"] },
                                    type: { type: Type.STRING, enum: ["task", "fixed"] },
                                    recurrence: { 
                                        type: Type.ARRAY, 
                                        items: { type: Type.NUMBER },
                                        description: "Giorni della settimana (0-6)"
                                    },
                                    durationMinutes: { type: Type.NUMBER },
                                    preferredTime: { type: Type.STRING, enum: ["morning", "afternoon", "evening", "any"] },
                                    startTime: { type: Type.STRING, description: "HH:MM solo se type=fixed" },
                                    details: { type: Type.STRING, description: "Dettagli operativi" }
                                },
                                required: ["title", "category", "type", "durationMinutes", "recurrence"]
                            }
                        }
                    },
                    required: ["plannedActivities"]
                }
            }
        });

        const text = response.text;
        if (!text) return { plannedActivities: [] };
        return JSON.parse(text) as GoalPlanResponse;
    } catch (e) {
        console.error("Goal Planning Error", e);
        return { plannedActivities: [] };
    }
};

/**
 * PHASE 2: Schedule a SINGLE specific day.
 */
export const generateSmartSchedule = async (
  tasks: Task[],
  fixedEvents: FixedEvent[],
  goals: Goal[], 
  _unusedFile: any | null,
  date: string
): Promise<AiScheduleResponse> => {
  
  try {
      const ai = getAI();
      // 1. Prepare Prompt parts (Text + Files)
      const parts: any[] = [];
      let fileContextDescription = "FILE ALLEGATI:\n";
      let hasFiles = false;

      const addAttachments = (attachments: UploadedFile[], contextDesc: string) => {
        if (!attachments || attachments.length === 0) return;
        
        attachments.forEach((att, idx) => {
            parts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.data
                }
            });
            fileContextDescription += `- [FILE] "${att.name}" riferito a: ${contextDesc}\n`;
            hasFiles = true;
        });
      };

      goals.forEach((g, idx) => {
        addAttachments(g.attachments, `Obiettivo #${idx+1}: ${g.title}`);
      });

      fixedEvents.forEach(ev => {
        addAttachments(ev.attachments, `Routine/Evento Fisso: ${ev.title} (${ev.startTime})`);
      });

      tasks.forEach(task => {
        addAttachments(task.attachments, `Task: ${task.title} (${task.type})`);
      });

      if (!hasFiles) fileContextDescription = "Nessun file allegato.";

      const promptText = `
        Sei un assistente per la gestione del tempo di altissimo livello.
        Pianifica l'agenda per il giorno: ${date}.
        Il giorno è di 24 ORE (00:00 - 23:59).

        *** OBIETTIVO: CATENA DI LOCALIZZAZIONE & INCASTRI PERFETTI ***
        
        TRAVEL AGENT MODE (Chain of Location):
        1. Tieni traccia della POSIZIONE CORRENTE dell'utente durante la giornata. 
        - Punto di partenza iniziale: "CASA".
        
        2. Quando incontri un evento con una 'location':
        - Calcola il tragitto partendo dalla POSIZIONE CORRENTE (che potrebbe essere Casa, oppure la location dell'evento precedente).
        - Crea un blocco 'travel' PRIMA dell'evento.
        - Titolo Spostamento: "Spostamento: [POSIZIONE CORRENTE] ➝ [NUOVA LOCATION]".
        - Aggiorna la POSIZIONE CORRENTE alla nuova location.
        
        3. Esempio logico:
        - 08:00 Casa.
        - Evento 10:00 in "Ufficio". Calcola "Casa -> Ufficio" (30 min). Inserisci Spostamento 09:30-10:00.
        - Posizione ora: "Ufficio".
        - Evento 18:00 in "Palestra" (che è vicina all'ufficio). Calcola "Ufficio -> Palestra" (15 min). Inserisci Spostamento 17:45-18:00.
        - NON calcolare da Casa se l'utente è già fuori!
        
        4. Mezzi di trasporto:
        - Se l'evento ha 'transportMode' (es. bicycle), usa quella velocità per la stima.

        LOGICA PRIORITÀ:
        1. ROUTINE E EVENTI FISSI (con i loro spostamenti calcolati come sopra).
        2. TASK INDEROGABILI (Priorità massima).
        3. TASK FLESSIBILI.

        DATI INPUT:
        - OBIETTIVI: ${JSON.stringify(goals.map(g => ({ title: g.title, deadline: g.targetDate })))}
        
        ${fileContextDescription}

        - ROUTINE (INAMOVIBILI):
        ${JSON.stringify(fixedEvents.map(e => ({
            title: e.title, start: e.startTime, end: e.endTime, 
            location: e.location, transportMode: e.transportMode,
            hasFiles: e.attachments.length > 0
        })))}

        - LISTA TASK DA INCASTRARE:
        ${JSON.stringify(tasks.map(t => ({
            title: t.title, type: t.type, duration: t.estimatedMinutes, 
            pref: t.preferredTime, hasFiles: t.attachments.length > 0,
            details: t.details
        })))}

        Output richiesto: JSON puro (schedule array + summary string).
      `;

      parts.unshift({ text: promptText });

      const response = await ai.models.generateContent({
        // SWITCHED TO 2.5 FLASH TO PREVENT FREEZE ON COMPLEX SCHEDULE
        model: "gemini-2.5-flash",
        contents: { parts: parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                schedule: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                    start: { type: Type.STRING, description: "HH:MM" },
                    end: { type: Type.STRING, description: "HH:MM" },
                    activity: { type: Type.STRING, description: "Nome attività." },
                    note: { type: Type.STRING, description: "Dettagli pratici." },
                    type: { type: Type.STRING, enum: ["task", "fixed", "travel"] },
                    location: { type: Type.STRING },
                    transportMode: { type: Type.STRING, enum: ["driving", "transit", "walking", "bicycling"] }
                    },
                    required: ["start", "end", "activity", "type"]
                }
                },
                summary: { type: Type.STRING }
            },
            required: ["schedule", "summary"]
            }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Risposta vuota");
      return JSON.parse(text.replace(/```json|```/g, '').trim()) as AiScheduleResponse;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
