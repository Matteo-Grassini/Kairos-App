
export type TaskType = 'Inderogabile' | 'Flessibile';

export interface UploadedFile {
  name: string;
  mimeType: string;
  data: string; // Base64 string without prefix
}

export type EventCategory = 'generic' | 'meal' | 'workout' | 'work' | 'study' | 'personal';

// NEW: Persisted Goals Interfaces
export interface DietGoals {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    water: number;
}

export interface WorkoutGoals {
    workoutsPerWeek: number;
    activeMinutes: number;
    caloriesBurn: number;
}

export interface RoutineGoals {
    habitsGoal: number;
    focusMinutes: number;
    sleepHours: number;
}

// NEW: App Settings & Preferences
export interface AppSettings {
    language: 'it' | 'en' | 'es';
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    timeFormat: '12h' | '24h';
    startOfWeek: 'monday' | 'sunday';
    autoLockMinutes: number; // 0 = disabled
    biometricEnabled: false;
    wakeUpTime: string; // NEW: Added wake up time
    notifications: {
        all: boolean;
        morningBrief: boolean;
        reminders: boolean;
        achievements: boolean;
    };
    autoBackup: boolean;
}

export interface AuditLogEntry {
    id: string;
    action: string; // "Login", "Failed Login", "Settings Change", "Data Export"
    timestamp: string;
    device: string;
    ip?: string;
    status: 'success' | 'warning' | 'failure';
}

// NEW: Wellness / Mindfulness
export type MoodType = 'Amazing' | 'Good' | 'Neutral' | 'Tired' | 'Stressed';

export interface WellnessEntry {
    id: string;
    date: string; // YYYY-MM-DD
    mood: MoodType;
    energyLevel: number; // 1-10
    gratitude: string[]; // 3 things
    notes?: string;
}

// NEW: Gamification
export interface Badge {
    id: string;
    title: string;
    description: string;
    icon: string; // lucide icon name
    color: string;
    isUnlocked: boolean;
    progress: number; // 0-100
    targetValue: number;
    currentValue: number;
}

export interface UserStats {
    level: number;
    currentXP: number;
    nextLevelXP: number;
    totalTasksCompleted: number;
    totalWorkouts: number;
    totalWellnessLogs: number;
    streakDays: number;
}

// NEW: Budget Categories
export type TransactionType = 'income' | 'expense';
export type BudgetCategory = 'Housing' | 'Food' | 'Transport' | 'Leisure' | 'Shopping' | 'Health' | 'Services' | 'Investments' | 'Income' | 'Other';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  category: BudgetCategory;
  description: string;
  attachments: UploadedFile[];
}

// NEW: Subscriptions
export type BillingCycle = 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextRenewalDate: string; // YYYY-MM-DD
  category: BudgetCategory;
  icon?: string; // For future use (brand logos)
  description?: string;
}

// NEW: Savings Goal
export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // YYYY-MM-DD
  color: string; // hex or tailwind class identifier
  icon: 'car' | 'home' | 'travel' | 'tech' | 'emergency' | 'piggy';
}

export type TransportMode = 'driving' | 'transit' | 'walking' | 'bicycling';

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface Exercise {
  name: string;
  sets: string; // e.g. "4" or "3-4"
  reps: string; // e.g. "12" or "8-10"
  weight?: string; // e.g. "20kg"
}

export interface WorkoutInfo {
  muscleGroup: string; // e.g. "Petto", "Gambe", "Full Body"
  intensity: 'Bassa' | 'Media' | 'Alta';
  estimatedCalories: number;
  exercises: Exercise[];
}

// NEW: Structured data for study sessions
export interface StudyInfo {
  subject: string; // e.g. "Matematica", "Storia"
  topic: string;   // e.g. "Integrali", "Impero Romano"
  method: 'Pomodoro' | 'Deep Work' | 'Lettura' | 'Ripasso' | 'Esercizi';
  keyConcepts: string[]; // List of specific concepts to master in this session
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  category: EventCategory;
  estimatedMinutes: number;
  isSplittable?: boolean;      
  minChunkMinutes?: number;    
  recurrence?: number[];       
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'any'; 
  completed: boolean;
  attachments: UploadedFile[]; 
  details?: string;
  cost?: number; // Added cost
}

export interface FixedEvent {
  id: string;
  title: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  category: EventCategory;
  details?: string; 
  recurrence?: number[]; 
  attachments: UploadedFile[];
  location?: string;           
  transportMode?: TransportMode; 
  nutritionalInfo?: NutritionalInfo; 
  workoutInfo?: WorkoutInfo; 
  studyInfo?: StudyInfo; // NEW
  cost?: number; // Added cost for auto-budgeting
}

// NEW: Sub-steps for goals
export interface GoalStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  description: string;
  attachments: UploadedFile[]; 
  steps: GoalStep[]; // List of milestones
  progress: number; // 0-100 percentage
}

export interface ScheduleItem {
  id: string;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  title: string;
  description?: string;
  isAiGenerated: boolean;
  type: 'task' | 'fixed' | 'travel'; 
  category?: EventCategory;
  details?: string;
  attachments: UploadedFile[];
  location?: string;           
  transportMode?: TransportMode; 
  nutritionalInfo?: NutritionalInfo;
  workoutInfo?: WorkoutInfo;
  studyInfo?: StudyInfo;
  cost?: number; // Added cost display
}

export interface AiScheduleResponse {
  schedule: {
    start: string;
    end: string;
    activity: string;
    note: string;
    type: 'task' | 'fixed' | 'travel';
    location?: string;
    transportMode?: TransportMode;
  }[];
  summary: string;
}

export interface GlobalExtractionResponse {
  extractedEvents: {
    date: string; // YYYY-MM-DD
    title: string;
    startTime?: string;
    endTime?: string;
    type: 'fixed' | 'task';
    details?: string;
    category?: EventCategory;
    estimatedMinutes?: number;
    location?: string;
  }[];
}

export interface GoalPlanResponse {
  plannedActivities: {
    title: string;
    category: EventCategory;
    type: 'task' | 'fixed';
    recurrence: number[]; // 0-6
    durationMinutes: number;
    preferredTime: 'morning' | 'afternoon' | 'evening' | 'any';
    details: string;
    startTime?: string; // only for fixed
  }[];
}

// UPDATED: Full Weekly Diet Response
export interface DietPlanResponse {
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    water: number;
  };
  weeklySchedule: {
    dayIndex: number; // 0=Sunday, 1=Monday...
    meals: {
        title: string;
        type: 'Colazione' | 'Pranzo' | 'Cena' | 'Snack';
        details: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        suggestedTime: string; // HH:MM
    }[];
  }[];
}

// NEW: Diet Plan Object for storage
export interface DietPlan {
    id: string;
    name: string;
    createdAt: string;
    data: DietPlanResponse;
    isActive: boolean;
}

// UPDATED: Full Weekly Workout Response
export interface WorkoutPlanResponse {
  goals: {
    workoutsPerWeek: number;
    activeMinutesPerDay: number;
    dailyCaloriesBurnGoal: number;
  };
  weeklySchedule: {
    dayIndex: number; // 0=Sunday, 1=Monday...
    title: string;
    muscleGroup: string;
    durationMinutes: number;
    intensity: 'Bassa' | 'Media' | 'Alta';
    exercises: Exercise[];
  }[];
}

export interface StudyPlanResponse {
  goals: {
    dailyStudyHours: number;
    sessionsPerWeek: number;
  };
  todaysSessions: {
    subject: string;
    topic: string;
    method: 'Pomodoro' | 'Deep Work' | 'Lettura' | 'Ripasso' | 'Esercizi';
    durationMinutes: number;
    suggestedTime: string; // HH:MM
    keyConcepts: string[];
  }[];
}

export interface RoutinePlanResponse {
  goals: {
    habitsToComplete: number;
    focusMinutes: number;
    sleepHours: number;
  };
  habits: {
    title: string;
    type: 'fixed' | 'flexible';
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    startTime?: string; // HH:MM for fixed
    durationMinutes: number;
    details: string;
  }[];
}

// NEW: Budget Response
export interface BudgetPlanResponse {
  monthlyBudget: number;
  savingsGoal: number;
  detectedTransactions: {
    date: string;
    amount: number;
    type: TransactionType;
    category: BudgetCategory;
    description: string;
  }[];
}
