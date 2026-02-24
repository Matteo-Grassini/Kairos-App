
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Calendar, CheckCircle2, Loader2, Target, Sparkles, Coffee, Utensils, Dumbbell, BookOpen, User, Plus, Trash2, Paperclip, RotateCcw, Layout, PieChart, Settings, Menu, Apple, ListTodo, Columns, BarChart3, LogOut, Sun, Sunset, Moon, Sunrise, PenTool, Clock, ChevronRight, Wallet, PiggyBank, ChevronDown, Infinity, Home, Zap, Repeat, LayoutGrid, X, Timer, CalendarDays, Heart, Crown, ShieldCheck } from 'lucide-react';
import { TaskList } from './components/TaskList';
import { MiniCalendar } from './components/MiniCalendar';
import { YearCalendar } from './components/YearCalendar';
import { CalendarSection } from './components/CalendarSection'; 
import { FixedEventList } from './components/FixedEventList';
import { GoalInput } from './components/GoalInput';
import { UnifiedActivityInput } from './components/UnifiedActivityInput';
import { RoutineModal } from './components/RoutineModal';
import { EventDetailModal } from './components/EventDetailModal';
import { LoginScreen } from './components/LoginScreen';
import { DietSection } from './components/DietSection';
import { WorkoutSection } from './components/WorkoutSection';
import { StudySection } from './components/StudySection'; 
import { RoutineSection } from './components/RoutineSection';
import { BudgetSection } from './components/BudgetSection';
import { ProfileSection } from './components/ProfileSection';
import { DashboardSection } from './components/DashboardSection';
import { DayDetailModal } from './components/DayDetailModal';
import { FocusTimer } from './components/FocusTimer';
import { LockScreen } from './components/LockScreen'; // NEW
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { generateSmartSchedule, extractGlobalEventsFromFiles, generateGoalPlan, parseNaturalLanguageAction } from './services/geminiService';
import { logout, saveUserData, subscribeToUserData, getLocalUser, subscribeToAuthChanges, isCloudEnabled } from './services/firebase'; 
import { Task, ScheduleItem, TaskType, FixedEvent, Goal, UploadedFile, EventCategory, TransportMode, NutritionalInfo, WorkoutInfo, StudyInfo, Transaction, SavingsGoal, BudgetCategory, Subscription, WellnessEntry, AppSettings } from './types';
import { playSound } from './services/soundService';
import { requestNotificationPermission, sendNotification } from './services/notificationService';
import { fetchWeather, WeatherData } from './services/weatherService';
import { Onboarding } from './components/Onboarding'; 

type DayData = {
  tasks: Task[];
  fixedEvents: FixedEvent[];
  schedule: ScheduleItem[];
  summary: string;
};

// --- CONFIGURAZIONE CREATORE ---
// Inserisci qui le email che devono avere accesso PRO gratuito automatico
// ORA ACCETTA QUALSIASI EMAIL CHE INIZIA CON 'admin' O 'creator' O SPECIFICA
const STATIC_ADMIN_EMAILS = ['admin@local', 'tuamail@gmail.com', 'admin@kairos.app', 'matty.grassini@gmail.com']; 

// Theme Helper Types
type ThemeColor = 'indigo' | 'violet' | 'rose' | 'orange' | 'emerald' | 'cyan' | 'slate' | 'amber' | 'zinc';

function App() {
  // --- AUTH STATE ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // --- SETTINGS STATE ---
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('notificationsEnabled') === 'true');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem('kairos_subscription') === 'pro');
  
  // NEW: Advanced Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
      const stored = localStorage.getItem('app_settings');
      return stored ? JSON.parse(stored) : {
          language: 'it',
          fontSize: 'medium',
          highContrast: false,
          timeFormat: '24h',
          startOfWeek: 'monday',
          autoLockMinutes: 0,
          biometricEnabled: false,
          notifications: { all: true, morningBrief: true, reminders: true, achievements: true },
          autoBackup: false
      };
  });

  const [isLocked, setIsLocked] = useState(false);
  const lastActivityRef = useRef(Date.now());

  // --- PERSONALIZATION STATE ---
  const [accentColor, setAccentColor] = useState<string>(() => localStorage.getItem('accentColor') || 'indigo');
  const [customName, setCustomName] = useState<string>(() => localStorage.getItem('customName') || '');

  // --- APP DATA STATE ---
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [daysData, setDaysData] = useState<Record<string, DayData>>({});
  const [recurringEvents, setRecurringEvents] = useState<FixedEvent[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [wellnessEntries, setWellnessEntries] = useState<WellnessEntry[]>([]);
  
  // --- UI STATE ---
  const [activeView, setActiveView] = useState<'dashboard' | 'planning' | 'calendar' | 'routine' | 'goals' | 'diet' | 'workout' | 'study' | 'budget' | 'profile'>('dashboard');
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  const [isYearCalendarOpen, setIsYearCalendarOpen] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  
  // --- QoL STATE ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  
  // Undo State
  const deletedItemRef = useRef<{ item: any, type: 'task' | 'event', dateKey: string } | null>(null);

  // --- REFS FOR SYNC CONTROL ---
  const isRemoteUpdate = useRef(false);
  const saveTimeout = useRef<any>(null);
  const notificationInterval = useRef<any>(null);

  const getDateKey = (date: Date) => date.toISOString().split('T')[0];
  const dateKey = getDateKey(currentDate);

  // --- HELPER: CHECK IF ADMIN ---
  const isAdminUser = useMemo(() => {
      if (!user || !user.email) return false;
      const email = user.email.toLowerCase();
      return STATIC_ADMIN_EMAILS.includes(email) || email.startsWith('admin') || email.startsWith('creator');
  }, [user]);

  // --- THEME UTILS ---
  const theme = useMemo(() => {
      const c = accentColor;
      return {
          bg: `bg-${c}-600`, // e.g. bg-indigo-600
          text: `text-${c}-600`,
          hoverBg: `hover:bg-${c}-50`,
          border: `border-${c}-200`,
          lightBg: `bg-${c}-50`,
          activeNav: `bg-slate-900 dark:bg-${c}-600`, // Active state uses slate-900 in light (classic) or accent in dark
          activeNavText: 'text-white'
      };
  }, [accentColor]);

  // --- AUTO LOCK LOGIC ---
  useEffect(() => {
      const resetIdle = () => { lastActivityRef.current = Date.now(); };
      
      window.addEventListener('mousemove', resetIdle);
      window.addEventListener('keydown', resetIdle);
      window.addEventListener('touchstart', resetIdle);

      const checkIdle = setInterval(() => {
          if (!settings.autoLockMinutes || settings.autoLockMinutes === 0) return;
          if (isLocked || !user) return; // Don't lock if already locked or not logged in

          const idleTime = Date.now() - lastActivityRef.current;
          if (idleTime > settings.autoLockMinutes * 60 * 1000) {
              setIsLocked(true);
          }
      }, 5000);

      return () => {
          window.removeEventListener('mousemove', resetIdle);
          window.removeEventListener('keydown', resetIdle);
          window.removeEventListener('touchstart', resetIdle);
          clearInterval(checkIdle);
      };
  }, [settings.autoLockMinutes, isLocked, user]);

  const updateSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      localStorage.setItem('app_settings', JSON.stringify(newSettings));
  };

  // --- STREAK CALCULATION (Gamification) ---
  const currentStreak = useMemo(() => {
      let streak = 0;
      const today = new Date();
      let d = new Date(today);
      d.setDate(d.getDate() - 1); 

      const todayKey = getDateKey(today);
      const todayData = daysData[todayKey];
      if (todayData && todayData.tasks.some(t => t.completed)) {
          streak++;
      }

      for (let i = 0; i < 365; i++) { 
          const key = getDateKey(d);
          const data = daysData[key];
          
          let hasActivity = false;
          if (data) {
              const hasCompletedTasks = data.tasks.some(t => t.completed);
              const hasEvents = data.fixedEvents.length > 0;
              if (hasCompletedTasks || hasEvents) hasActivity = true;
          }

          if (hasActivity) {
              streak++;
              d.setDate(d.getDate() - 1);
          } else {
              break;
          }
      }
      return streak;
  }, [daysData]);

  // --- HELPER FOR WEEKLY VIEW ---
  const getEventsForWeek = useCallback((startOfWeek: Date) => {
      const result: Record<string, ScheduleItem[]> = {};
      
      for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(d.getDate() + i);
          const key = getDateKey(d);
          const dayOfWeek = d.getDay();

          const specific = daysData[key]?.fixedEvents || [];
          const recurring = recurringEvents.filter(ev => ev.recurrence && ev.recurrence.includes(dayOfWeek));

          const items: ScheduleItem[] = [...specific, ...recurring].map(ev => ({
              id: ev.id,
              startTime: ev.startTime,
              endTime: ev.endTime,
              title: ev.title,
              isAiGenerated: false,
              type: 'fixed',
              category: ev.category,
              details: ev.details,
              attachments: ev.attachments,
              location: ev.location,
              transportMode: ev.transportMode,
              nutritionalInfo: ev.nutritionalInfo,
              workoutInfo: ev.workoutInfo,
              studyInfo: ev.studyInfo,
              cost: ev.cost
          }));

          items.sort((a,b) => a.startTime.localeCompare(b.startTime));
          result[key] = items;
      }
      return result;
  }, [daysData, recurringEvents]);

  // --- TOAST HELPER ---
  const addToast = (message: string, type: ToastType = 'success', onUndo?: () => void) => {
      const id = uuidv4();
      setToasts(prev => [...prev, { id, message, type, onUndo }]);
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- WEATHER EFFECT ---
  useEffect(() => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
              const w = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
              if (w) setWeather(w);
          }, (err) => console.log("Weather loc error", err));
      }
  }, []);

  // --- SHORTCUTS EFFECT ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              setActiveView('planning');
              addToast('Modalità Pianificazione', 'info');
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
              e.preventDefault();
              setActiveView('calendar');
              addToast('Modalità Agenda', 'info');
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
              e.preventDefault();
              setActiveView('dashboard');
              addToast('Home', 'info');
          }
          if (e.key === 'Escape') {
              setIsRoutineModalOpen(false);
              setIsDayDetailModalOpen(false);
              setIsYearCalendarOpen(false);
              setIsMobileMenuOpen(false);
              setSelectedEvent(null);
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- SETTINGS EFFECTS ---
  useEffect(() => {
      if (darkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
      localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  useEffect(() => {
      localStorage.setItem('customName', customName);
  }, [customName]);

  const toggleDarkMode = () => {
      setDarkMode(!darkMode);
      if (soundEnabled) playSound.click();
  };

  const toggleSound = () => {
      setSoundEnabled(!soundEnabled);
      localStorage.setItem('soundEnabled', String(!soundEnabled));
      if (!soundEnabled) playSound.success();
  };

  const toggleNotifications = async () => {
      if (!notificationsEnabled) {
          const granted = await requestNotificationPermission();
          if (granted) {
              setNotificationsEnabled(true);
              localStorage.setItem('notificationsEnabled', 'true');
              addToast("Notifiche Attive", 'success');
              if (soundEnabled) playSound.success();
          } else {
              addToast("Permesso notifiche negato", 'error');
          }
      } else {
          setNotificationsEnabled(false);
          localStorage.setItem('notificationsEnabled', 'false');
      }
  };

  // --- ONBOARDING CHECK ---
  useEffect(() => {
      // Check if current user is new
      if (user?.isNewUser) {
          const hasCompleted = localStorage.getItem(`onboarding_done_${user.uid}`);
          if (!hasCompleted) {
              setShowOnboarding(true);
          }
      }
  }, [user]);

  const completeOnboarding = () => {
      if (user?.uid) {
          localStorage.setItem(`onboarding_done_${user.uid}`, 'true');
      }
      setShowOnboarding(false);
      playSound.success();
  };

  // --- CREATOR / ADMIN CHECK EFFECT ---
  // Se l'utente è un admin, attiva il premium automaticamente
  useEffect(() => {
      if (user && isAdminUser) {
          // Se non è già premium, attivalo
          if (!isPremium) {
              setIsPremium(true);
              localStorage.setItem('kairos_subscription', 'pro');
              addToast('Modalità Creatore Attiva 👑', 'success');
          }
      }
  }, [user, isPremium, isAdminUser]);

  const togglePremiumManual = () => {
      const newState = !isPremium;
      setIsPremium(newState);
      if (newState) {
          localStorage.setItem('kairos_subscription', 'pro');
          addToast('Premium Attivato (Dev)', 'success');
      } else {
          localStorage.removeItem('kairos_subscription');
          addToast('Premium Disattivato (Dev)', 'info');
      }
  };

  // --- NOTIFICATION CHECKER ---
  useEffect(() => {
      if (!notificationsEnabled) {
          if (notificationInterval.current) clearInterval(notificationInterval.current);
          return;
      }

      notificationInterval.current = setInterval(() => {
          const now = new Date();
          const currentHour = now.getHours().toString().padStart(2, '0');
          const currentMin = now.getMinutes().toString().padStart(2, '0');
          const currentTime = `${currentHour}:${currentMin}`;

          const todayKey = getDateKey(now);
          const todaySchedule = daysData[todayKey]?.schedule || [];

          const item = todaySchedule.find(i => i.startTime === currentTime);
          if (item) {
              sendNotification(`Inizia ora: ${item.title}`, item.description || "Controlla l'agenda per dettagli.");
              if (soundEnabled) playSound.notification();
          }
      }, 60000); 

      return () => clearInterval(notificationInterval.current);
  }, [daysData, notificationsEnabled, soundEnabled]);


  // --- AUTH & SYNC EFFECTS ---
  useEffect(() => {
    // 1. Check Local User First (Fastest)
    const localUser = getLocalUser();
    if (localUser) {
        setUser(localUser);
        setCustomName(localUser.displayName); // Sync name state
        setAuthLoading(false);
        return; // Skip Firebase/Supabase check if local user exists
    }

    // 2. Subscribe to Auth (Supabase or Fallback)
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            // Only clear if we aren't using a local user (handled above)
            setUser(null);
        }
        setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // --- CLOUD STATUS NOTIFICATION ---
  useEffect(() => {
      if (!authLoading) {
          if (isCloudEnabled) {
              addToast('Connesso a Supabase Cloud', 'success');
          } else {
              addToast('Modalità Locale (Offline)', 'info');
          }
      }
  }, [authLoading]);

  useEffect(() => {
    if (!user) {
        setDaysData({});
        setRecurringEvents([]);
        setRecurringTasks([]);
        setGoals([]);
        setTransactions([]);
        setSavingsGoals([]);
        setSubscriptions([]);
        setWellnessEntries([]);
        return;
    }
    
    // Subscribe to data (Works for both Cloud and Local)
    const unsubscribe = subscribeToUserData(user.uid, (data) => {
        if (data) {
            isRemoteUpdate.current = true;
            if (data.daysData) setDaysData(data.daysData || {});
            if (data.recurringEvents) setRecurringEvents(data.recurringEvents || []);
            if (data.recurringTasks) setRecurringTasks(data.recurringTasks || []);
            if (data.goals) setGoals(data.goals || []);
            if (data.transactions) setTransactions(data.transactions || []);
            if (data.savingsGoals) setSavingsGoals(data.savingsGoals || []);
            if (data.subscriptions) setSubscriptions(data.subscriptions || []);
            if (data.wellnessEntries) setWellnessEntries(data.wellnessEntries || []);
            
            // --- SYNC PROFILE DATA FROM CLOUD ---
            if (data.userProfile) {
                if (data.userProfile.customName) setCustomName(data.userProfile.customName);
                if (data.userProfile.accentColor) setAccentColor(data.userProfile.accentColor);
                if (data.userProfile.settings) setSettings(data.userProfile.settings);
            }

            setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || isRemoteUpdate.current) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
        const payload = {
            daysData,
            recurringEvents,
            recurringTasks,
            goals,
            transactions,
            savingsGoals,
            subscriptions,
            wellnessEntries,
            // --- SYNC PROFILE DATA TO CLOUD ---
            userProfile: {
                customName,
                accentColor,
                settings
            },
            lastUpdated: new Date().toISOString()
        };
        saveUserData(user.uid, payload);
    }, 2000); 
    return () => { if(saveTimeout.current) clearTimeout(saveTimeout.current); }
  }, [daysData, recurringEvents, recurringTasks, goals, transactions, savingsGoals, subscriptions, wellnessEntries, user, customName, accentColor, settings]);

  // --- HANDLERS ---
  const handleLocalLogin = (loggedUser: any) => {
      setUser(loggedUser);
      setCustomName(loggedUser.displayName);
      setAuthLoading(false);
      if(soundEnabled) playSound.success();
  };

  const handleUpdateUser = (updates: any) => {
      setUser((prev: any) => ({ ...prev, ...updates }));
  };

  const handleLogout = () => {
      logout();
      setUser(null);
      // Clean local state to prevent ghost data
      setDaysData({});
      setRecurringEvents([]);
      setRecurringTasks([]);
      setGoals([]);
      setTransactions([]);
      setSavingsGoals([]);
      setSubscriptions([]);
      setWellnessEntries([]);
      setActiveView('dashboard');
  };

  const handleViewChange = (view: any) => {
      setActiveView(view);
      setIsMobileMenuOpen(false); // Close mobile menu on navigation
      if(soundEnabled) playSound.click();
  }

  // --- COMPUTED DATA ---
  const allActiveEvents = useMemo(() => {
    const dayOfWeek = currentDate.getDay(); 
    const specificEvents = daysData[dateKey]?.fixedEvents || [];
    const relevantRecurring = recurringEvents.filter(ev => 
        ev.recurrence && ev.recurrence.includes(dayOfWeek)
    );
    return [...specificEvents, ...relevantRecurring];
  }, [daysData, recurringEvents, dateKey, currentDate]);

  const allActiveTasks = useMemo(() => {
    const dayOfWeek = currentDate.getDay();
    const dailyTasks = daysData[dateKey]?.tasks || [];
    const dailyTaskIds = new Set(dailyTasks.map(t => t.id));
    const relevantRecurringTasks = recurringTasks.filter(t => 
        t.recurrence && t.recurrence.includes(dayOfWeek) && !dailyTaskIds.has(t.id)
    );
    return [...dailyTasks, ...relevantRecurringTasks];
  }, [daysData, recurringTasks, dateKey, currentDate]);

  const routineProgress = useMemo(() => {
      const routineItems = [...allActiveEvents, ...allActiveTasks].filter(i => 
          i.category === 'personal' || i.category === 'generic'
      );
      if (routineItems.length === 0) return 0;
      const totalTasks = allActiveTasks.filter(t => t.category === 'personal').length;
      if (totalTasks === 0) return 0;
      const completedTasks = allActiveTasks.filter(t => t.category === 'personal' && t.completed).length;
      return Math.round((completedTasks / totalTasks) * 100);
  }, [allActiveEvents, allActiveTasks]);

  const agendaEvents = allActiveEvents.filter(e => e.category !== 'meal');
  const agendaTasks = allActiveTasks.filter(t => t.category === 'work' || t.category === 'generic');
  const routineEvents = allActiveEvents.filter(e => e.category === 'personal' || e.category === 'generic');
  const routineTasks = allActiveTasks.filter(t => t.category === 'personal' || t.category === 'generic');
  const dietMeals = allActiveEvents.filter(e => e.category === 'meal');
  const workoutSessions = allActiveEvents.filter(e => e.category === 'workout');
  const studySessions = allActiveEvents.filter(e => e.category === 'study');

  const currentData = useMemo(() => {
    return daysData[dateKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
  }, [daysData, dateKey]);

  const checkDayHasActivity = useCallback((date: Date): boolean => {
      const dKey = getDateKey(date);
      const dayOfWeek = date.getDay();

      const hasSpecific = daysData[dKey]?.fixedEvents?.length > 0 || daysData[dKey]?.tasks?.length > 0;
      if (hasSpecific) return true;

      const hasRecurringEvent = recurringEvents.some(e => e.recurrence && e.recurrence.includes(dayOfWeek));
      if (hasRecurringEvent) return true;

      const hasRecurringTask = recurringTasks.some(t => t.recurrence && t.recurrence.includes(dayOfWeek));
      if (hasRecurringTask) return true;

      return false;
  }, [daysData, recurringEvents, recurringTasks]);

  const handleDateSelection = (date: Date) => {
      setCurrentDate(date);
      if (activeView !== 'calendar' && activeView !== 'dashboard') {
          setIsDayDetailModalOpen(true);
      }
      if (soundEnabled) playSound.click();
  };

  useEffect(() => {
    if (currentData.schedule.length === 0 && allActiveEvents.length > 0) {
      const fixedScheduleItems: ScheduleItem[] = allActiveEvents.map(ev => ({
        id: ev.id,
        startTime: ev.startTime,
        endTime: ev.endTime,
        title: ev.title,
        isAiGenerated: false,
        type: 'fixed',
        description: ev.details || (ev.category === 'meal' ? 'Pasto programmato' : ev.category === 'workout' ? 'Sessione allenamento' : 'Appuntamento fisso'),
        category: ev.category,
        details: ev.details,
        attachments: ev.attachments,
        location: ev.location,
        transportMode: ev.transportMode,
        nutritionalInfo: ev.nutritionalInfo,
        workoutInfo: ev.workoutInfo,
        studyInfo: ev.studyInfo,
        cost: ev.cost 
      }));
      fixedScheduleItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

      setDaysData(prev => ({
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' }),
          schedule: fixedScheduleItems
        }
      }));
    }
  }, [allActiveEvents, dateKey, currentData.schedule.length]); 

  const updateDayData = (updater: (prev: DayData) => DayData) => {
    setDaysData(prev => {
      const current = prev[dateKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
      return {
        ...prev,
        [dateKey]: updater(current)
      };
    });
  };

  const handleRestoreItem = () => {
      const deleted = deletedItemRef.current;
      if (!deleted) return;

      if (deleted.type === 'task') {
          updateDayData(data => ({ ...data, tasks: [...data.tasks, deleted.item] }));
      } else {
          const targetKey = deleted.dateKey;
          setDaysData(prev => {
              const current = prev[targetKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
              return { ...prev, [targetKey]: { ...current, fixedEvents: [...current.fixedEvents, deleted.item] } };
          });
      }
      deletedItemRef.current = null;
      if(soundEnabled) playSound.success();
  };

  // --- CRUD ACTIONS ---
  const addTask = (title: string, type: TaskType, category: EventCategory, estimatedMinutes: number, isSplittable: boolean, minChunkMinutes: number, attachments: UploadedFile[] = [], recurrence?: number[], preferredTime?: 'morning' | 'afternoon' | 'evening' | 'any', details?: string) => {
    const newTask: Task = { 
        id: uuidv4(), title, type, category, estimatedMinutes, isSplittable, minChunkMinutes, recurrence, preferredTime, completed: false, attachments, details
    };
    if (recurrence && recurrence.length > 0) setRecurringTasks(prev => [...prev, newTask]);
    else updateDayData(data => ({ ...data, tasks: [...data.tasks, newTask] }));
    addToast('Attività aggiunta', 'success');
    if(soundEnabled) playSound.success();
  };

  const removeTask = (id: string) => {
    const taskToRemove = daysData[dateKey]?.tasks.find(t => t.id === id);
    if (taskToRemove) {
        deletedItemRef.current = { item: taskToRemove, type: 'task', dateKey };
        updateDayData(data => ({ ...data, tasks: data.tasks.filter(t => t.id !== id) }));
        addToast('Attività rimossa', 'info', handleRestoreItem);
    } else {
        setRecurringTasks(prev => prev.filter(t => t.id !== id));
        addToast('Attività rimossa', 'info');
    }
    if(soundEnabled) playSound.delete();
  };

  const toggleTaskCompletion = (id: string) => {
      const dailyTask = daysData[dateKey]?.tasks.find(t => t.id === id);
      if (dailyTask) {
          updateDayData(data => ({
              ...data,
              tasks: data.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
          }));
      } else {
          const recurring = recurringTasks.find(t => t.id === id);
          if (recurring) {
              updateDayData(data => ({
                  ...data,
                  tasks: [...data.tasks, { ...recurring, completed: true }]
              }));
          }
      }
      if(soundEnabled) playSound.success();
  };

  const addFixedEvent = (title: string, start: string, end: string, category: EventCategory, details: string, recurrence: number[], attachments: UploadedFile[] = [], targetDateString?: string, location?: string, transportMode?: TransportMode, nutritionalInfo?: NutritionalInfo, workoutInfo?: WorkoutInfo, studyInfo?: StudyInfo, cost?: number) => {
    const newEvent: FixedEvent = { 
        id: uuidv4(), title, startTime: start, endTime: end, category, details, recurrence, attachments, location, transportMode, nutritionalInfo, workoutInfo, studyInfo, cost
    };
    
    if (cost && cost > 0) {
        const transactionDate = targetDateString || dateKey;
        const newTransaction: Transaction = {
            id: uuidv4(),
            amount: cost,
            type: 'expense',
            category: 'Other', 
            description: title,
            date: transactionDate,
            attachments: attachments || []
        };
        setTransactions(prev => [...prev, newTransaction]);
    }

    if (recurrence.length > 0) {
        setRecurringEvents(prev => [...prev, newEvent]);
        updateDayData(data => ({ ...data, schedule: [] }));
    } else {
        const targetKey = targetDateString || dateKey; 
        setDaysData(prev => {
            const currentDayData = prev[targetKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
            return { ...prev, [targetKey]: { ...currentDayData, fixedEvents: [...currentDayData.fixedEvents, newEvent], schedule: [] } };
        });
    }
    addToast('Evento aggiunto', 'success');
    if(soundEnabled) playSound.success();
  };

  const removeFixedEvent = (id: string) => {
    if (recurringEvents.some(e => e.id === id)) {
        setRecurringEvents(prev => prev.filter(e => e.id !== id));
        updateDayData(data => ({ ...data, schedule: [] }));
        addToast('Evento rimosso', 'info');
    } else {
        const eventToRemove = daysData[dateKey]?.fixedEvents.find(e => e.id === id);
        if (eventToRemove) {
            deletedItemRef.current = { item: eventToRemove, type: 'event', dateKey };
            updateDayData(data => ({ ...data, fixedEvents: data.fixedEvents.filter(e => e.id !== id), schedule: [] }));
            addToast('Evento rimosso', 'info', handleRestoreItem);
        }
    }
    if(soundEnabled) playSound.delete();
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
      const newTransaction = { ...t, id: uuidv4() };
      setTransactions(prev => [...prev, newTransaction]);
      addToast('Transazione registrata', 'success');
      if(soundEnabled) playSound.success();
  };

  const removeTransaction = (id: string) => {
      setTransactions(prev => prev.filter(t => t.id !== id));
      if(soundEnabled) playSound.delete();
  };

  const addSubscription = (sub: Subscription) => {
      setSubscriptions(prev => [...prev, sub]);
      addToast('Abbonamento aggiunto', 'success');
      if(soundEnabled) playSound.success();
  }

  const removeSubscription = (id: string) => {
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      if(soundEnabled) playSound.delete();
  }

  const addSavingsGoal = (goal: SavingsGoal) => {
      setSavingsGoals(prev => [...prev, goal]);
      addToast('Obiettivo risparmio creato', 'success');
      if(soundEnabled) playSound.success();
  };

  const updateSavingsGoal = (updatedGoal: SavingsGoal) => {
      setSavingsGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
      if(soundEnabled) playSound.success();
  };

  const removeSavingsGoal = (id: string) => {
      setSavingsGoals(prev => prev.filter(g => g.id !== id));
      if(soundEnabled) playSound.delete();
  };

  const addWellnessEntry = (entry: WellnessEntry) => {
      setWellnessEntries(prev => [...prev.filter(e => e.date !== entry.date), entry]);
      addToast('Diario salvato', 'success');
  };

  const clearSchedule = () => {
      updateDayData(data => ({ ...data, schedule: [], summary: '' }));
      addToast('Agenda resettata', 'info');
      if(soundEnabled) playSound.delete();
  }
  
  const handleAddGoal = async (goal: Goal) => {
      setGoals(prev => [...prev, goal]);
      setLoading(true);
      setLoadingStage('Generazione piano d\'azione...');
      try {
          const plan = await generateGoalPlan(goal);
          if (plan.plannedActivities && plan.plannedActivities.length > 0) {
              plan.plannedActivities.forEach(activity => {
                  if (activity.type === 'fixed' && activity.startTime) {
                      const [h, m] = activity.startTime.split(':').map(Number);
                      const totalMins = h * 60 + m + (activity.durationMinutes || 60);
                      const endH = Math.floor(totalMins / 60) % 24;
                      const endM = totalMins % 60;
                      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                      addFixedEvent(activity.title, activity.startTime, endTime, activity.category, activity.details, activity.recurrence || [], []);
                  } else {
                      addTask(activity.title, 'Flessibile', activity.category, activity.durationMinutes || 60, false, 30, [], activity.recurrence || [], activity.preferredTime || 'any', activity.details);
                  }
              });
          }
          addToast('Obiettivo e piano creati!', 'success');
          if(soundEnabled) playSound.success();
      } catch (error) {
          console.error("Failed to generate goal plan", error);
          addToast("Errore generazione piano AI", 'error');
          if(soundEnabled) playSound.error();
      } finally {
          setLoading(false);
          setLoadingStage('');
      }
  };
  
  const removeGoal = (id: string) => {
      setGoals(prev => prev.filter(g => g.id !== id));
      addToast('Obiettivo rimosso', 'info');
      if(soundEnabled) playSound.delete();
  };
  
  const toggleGoalStep = (goalId: string, stepId: string) => {
      setGoals(prev => prev.map(goal => {
          if (goal.id !== goalId) return goal;
          const updatedSteps = goal.steps.map(step => step.id === stepId ? { ...step, completed: !step.completed } : step);
          const completedCount = updatedSteps.filter(s => s.completed).length;
          const progress = updatedSteps.length > 0 ? (completedCount / updatedSteps.length) * 100 : 0;
          return { ...goal, steps: updatedSteps, progress };
      }));
      if(soundEnabled) playSound.click();
  };

  const handleEventClick = (event: FixedEvent | ScheduleItem) => {
      if (event.category === 'meal') { setActiveView('diet'); return; }
      if (event.category === 'workout') { setActiveView('workout'); return; }
      if (event.category === 'study') { setActiveView('study'); return; }

      const itemForModal: ScheduleItem = 'type' in event ? (event as ScheduleItem) : {
          id: event.id, startTime: event.startTime, endTime: event.endTime, title: event.title, isAiGenerated: false, type: 'fixed',
          category: event.category, details: event.details, attachments: event.attachments, location: event.location, transportMode: event.transportMode
      };
      setSelectedEvent(itemForModal);
      if(soundEnabled) playSound.click();
  };

  const handleUpdateEvent = (id: string, newDetails: string, newDate?: Date) => {
      setRecurringEvents(prev => prev.map(e => e.id === id ? { ...e, details: newDetails } : e));
      updateDayData(data => ({
          ...data,
          fixedEvents: data.fixedEvents.map(e => e.id === id ? { ...e, details: newDetails } : e),
          tasks: data.tasks.map(t => t.id === id ? { ...t, details: newDetails } : t),
          schedule: data.schedule.map(s => s.id === id ? { ...s, details: newDetails, description: newDetails } : s)
      }));
      
      if (newDate) {
          const oldDateKey = getDateKey(currentDate);
          const newDateKey = getDateKey(newDate);
          
          if (oldDateKey !== newDateKey) {
              setDaysData(prev => {
                  const sourceDay = prev[oldDateKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
                  const targetDay = prev[newDateKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
                  
                  const eventToMove = sourceDay.fixedEvents.find(e => e.id === id);
                  const taskToMove = sourceDay.tasks.find(t => t.id === id);

                  if (eventToMove) {
                      return {
                          ...prev,
                          [oldDateKey]: { ...sourceDay, fixedEvents: sourceDay.fixedEvents.filter(e => e.id !== id), schedule: [] },
                          [newDateKey]: { ...targetDay, fixedEvents: [...targetDay.fixedEvents, { ...eventToMove, details: newDetails }], schedule: [] }
                      };
                  } else if (taskToMove) {
                      return {
                          ...prev,
                          [oldDateKey]: { ...sourceDay, tasks: sourceDay.tasks.filter(t => t.id !== id) },
                          [newDateKey]: { ...targetDay, tasks: [...targetDay.tasks, { ...taskToMove, details: newDetails }] }
                      };
                  }
                  return prev;
              });
              addToast(`Spostato al ${newDate.toLocaleDateString()}`, 'info');
              if(soundEnabled) playSound.success();
          }
      } else {
          setSelectedEvent(prev => prev ? { ...prev, details: newDetails, description: newDetails } : null);
          addToast('Dettagli aggiornati', 'success');
          if(soundEnabled) playSound.success();
      }
  };

  const handleBatchAction = (action: 'moveAllNextDay' | 'movePendingNextDay' | 'clearAll' | 'clearCompleted') => {
      const todayKey = dateKey;
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = getDateKey(tomorrow);

      setDaysData(prev => {
          const todayData = prev[todayKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
          const tomorrowData = prev[tomorrowKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
          
          let newToday = { ...todayData };
          let newTomorrow = { ...tomorrowData };

          if (action === 'moveAllNextDay') {
              newTomorrow.fixedEvents = [...newTomorrow.fixedEvents, ...todayData.fixedEvents];
              newTomorrow.tasks = [...newTomorrow.tasks, ...todayData.tasks];
              newToday.fixedEvents = [];
              newToday.tasks = [];
              newToday.schedule = [];
              addToast('Tutto spostato a domani', 'info');
          } 
          else if (action === 'movePendingNextDay') {
              const pendingTasks = todayData.tasks.filter(t => !t.completed);
              const completedTasks = todayData.tasks.filter(t => t.completed);
              newTomorrow.tasks = [...newTomorrow.tasks, ...pendingTasks];
              newToday.tasks = completedTasks;
              addToast('Task pendenti spostati', 'info');
          }
          else if (action === 'clearAll') {
              newToday.fixedEvents = [];
              newToday.tasks = [];
              newToday.schedule = [];
              addToast('Giornata svuotata', 'error');
          }
          else if (action === 'clearCompleted') {
              newToday.tasks = todayData.tasks.filter(t => !t.completed);
              addToast('Completati rimossi', 'success');
          }

          return {
              ...prev,
              [todayKey]: newToday,
              [tomorrowKey]: newTomorrow
          };
      });
      
      if(soundEnabled) playSound.delete();
      setIsDayDetailModalOpen(false);
  };

  const handleGlobalOptimization = async () => {
    setLoading(true);
    setActiveView('calendar');
    try {
        setLoadingStage('Analisi documenti...');
        const allFiles: UploadedFile[] = [];
        goals.forEach(g => g.attachments && allFiles.push(...g.attachments));
        recurringTasks.forEach(t => t.attachments && allFiles.push(...t.attachments));
        recurringEvents.forEach(e => e.attachments && allFiles.push(...e.attachments));
        (daysData[dateKey]?.tasks || []).forEach(t => t.attachments && allFiles.push(...t.attachments));

        const uniqueFiles = allFiles.filter((file, index, self) => index === self.findIndex((f) => f.name === file.name && f.data.length === file.data.length));
        let workingDaysData = { ...daysData };

        if (uniqueFiles.length > 0) {
             const extractionResult = await extractGlobalEventsFromFiles(uniqueFiles, dateKey);
             extractionResult.extractedEvents.forEach(extracted => {
                 const targetDateKey = extracted.date;
                 const dayData = workingDaysData[targetDateKey] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
                 const exists = dayData.fixedEvents.some(e => e.title === extracted.title && e.startTime === extracted.startTime) || dayData.tasks.some(t => t.title === extracted.title);

                 if (!exists) {
                     if (extracted.type === 'fixed' && extracted.startTime && extracted.endTime) {
                         const newEvent: FixedEvent = {
                             id: uuidv4(), title: extracted.title, startTime: extracted.startTime, endTime: extracted.endTime, category: extracted.category || 'generic', details: extracted.details || '', recurrence: [], attachments: [], location: extracted.location
                         };
                         dayData.fixedEvents.push(newEvent);
                     } else {
                         const newTask: Task = {
                             id: uuidv4(), title: extracted.title, type: 'Flessibile', category: extracted.category || 'generic', estimatedMinutes: extracted.estimatedMinutes || 60, completed: false, isSplittable: false, recurrence: [], preferredTime: 'any', attachments: [], details: extracted.details
                         };
                         dayData.tasks.push(newTask);
                     }
                     dayData.schedule = []; 
                     workingDaysData[targetDateKey] = dayData;
                 }
             });
        }

        setLoadingStage('Calcolo percorso migliore...');
        const distinctDates = new Set([...Object.keys(workingDaysData), dateKey]);
        const updates: Record<string, { schedule: ScheduleItem[], summary: string }> = {};

        await Promise.all(Array.from(distinctDates).map(async (key) => {
            const dateObj = new Date(key);
            const dayOfWeek = dateObj.getDay();
            const dayData = workingDaysData[key] || { tasks: [], fixedEvents: [], schedule: [], summary: '' };
            const relevantRecurringEvents = recurringEvents.filter(ev => ev.recurrence && ev.recurrence.includes(dayOfWeek));
            const combinedFixed = [...dayData.fixedEvents, ...relevantRecurringEvents];
            const relevantRecurringTasks = recurringTasks.filter(t => t.recurrence && t.recurrence.includes(dayOfWeek));
            const combinedTasks = [...dayData.tasks, ...relevantRecurringTasks];
            
            if (combinedTasks.length === 0 && combinedFixed.length === 0 && goals.length === 0) return;
            if (dayData.schedule.length === 0 || key === dateKey) {
                const response = await generateSmartSchedule(combinedTasks, combinedFixed, goals, null, dateObj.toLocaleDateString());
                const newSchedule: ScheduleItem[] = response.schedule.map((item) => {
                    const originalTask = combinedTasks.find(t => t.title === item.activity);
                    const originalEvent = combinedFixed.find(e => e.title === item.activity);
                    return {
                        id: uuidv4(), startTime: item.start, endTime: item.end, title: item.activity, description: item.note, isAiGenerated: item.type === 'task', type: item.type === 'fixed' || item.type === 'travel' ? item.type : 'task',
                        category: originalEvent?.category || originalTask?.category || (item.activity.match(/pranzo|cena/i) ? 'meal' : 'generic'),
                        details: originalEvent?.details || item.note, attachments: originalEvent?.attachments || originalTask?.attachments || [], location: item.location || originalEvent?.location, transportMode: item.transportMode || originalEvent?.transportMode,
                        cost: originalEvent?.cost 
                    };
                });
                newSchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
                updates[key] = { schedule: newSchedule, summary: response.summary };
            }
        }));

        setDaysData(prev => {
            const nextState = { ...workingDaysData }; 
            Object.entries(updates).forEach(([key, update]) => {
                nextState[key] = { ...(nextState[key] || { tasks: [], fixedEvents: [] }), schedule: update.schedule, summary: update.summary };
            });
            return nextState;
        });
        
        addToast('Agenda ottimizzata con successo!', 'success');
        if(soundEnabled) playSound.notification();

    } catch (error: any) {
      if (error.message.includes("API Key mancante")) {
         setActiveView('profile');
         addToast("Chiave API mancante. Verificala nel profilo.", 'error');
      } else {
         addToast(`Errore: ${error.message}`, 'error');
      }
      if(soundEnabled) playSound.error();
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const hasDataToOptimize = useMemo(() => allActiveTasks.length > 0 || allActiveEvents.length > 0 || goals.length > 0, [allActiveTasks, allActiveEvents, goals]);

  // Flatten tasks and events for gamification
  const flatTasks = Object.values(daysData).flatMap((d: DayData) => d.tasks);
  const flatEvents = Object.values(daysData).flatMap((d: DayData) => d.fixedEvents);

  const NavItem = ({ id, label, icon: Icon, activeView, setActiveView }: any) => {
      const isActive = activeView === id;
      const activeClass = isActive 
        ? `${theme.activeNav} ${theme.activeNavText} shadow-lg shadow-slate-300 dark:shadow-none scale-105` 
        : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white';

      return (
          <button 
              onClick={() => handleViewChange(id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group ${activeClass}`}
          >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              {label}
              {isActive && <ChevronRight size={16} className="ml-auto opacity-50" />}
          </button>
      );
  };

  const MobileMenuButton = ({ id, label, icon: Icon, color, bg }: any) => (
      <button 
        onClick={() => { handleViewChange(id); setIsMobileMenuOpen(false); }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-all hover:shadow-md h-32 w-full group"
      >
          <div className={`p-3 rounded-2xl ${bg} ${color} mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
              <Icon size={32} />
          </div>
          <span className="text-sm font-bold text-slate-800 dark:text-white">{label}</span>
      </button>
  );

  if (authLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-[#F3F4F6] dark:bg-slate-900">
            <Loader2 className="animate-spin text-slate-400" size={40} />
        </div>
    )
  }

  if (isLocked) {
      return (
          <LockScreen 
            onUnlock={() => setIsLocked(false)} 
            userPin={user?.pin} 
            isBiometricEnabled={settings.biometricEnabled}
          />
      );
  }

  if (!user) {
    return <LoginScreen onGuestLogin={handleLocalLogin} />;
  }

  return (
    <div className={`flex h-[100dvh] w-full text-slate-900 dark:text-slate-100 font-sans overflow-hidden lg:flex-row flex-col p-0 lg:p-4 gap-4 transition-colors duration-300 ${settings.fontSize === 'small' ? 'text-sm' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
      
      {/* ONBOARDING OVERLAY */}
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}

      {/* GLOBAL UI ELEMENTS */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {showFocusTimer && <FocusTimer onClose={() => setShowFocusTimer(false)} />}

      {/* Modals */}
      <RoutineModal isOpen={isRoutineModalOpen} onClose={() => setIsRoutineModalOpen(false)} currentDate={currentDate} onAddFixed={addFixedEvent} onAddTask={addTask} />
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} date={currentDate} onUpdateEvent={handleUpdateEvent} onStartFocusTimer={() => setShowFocusTimer(true)} />
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col p-6 animate-in slide-in-from-bottom-10 duration-200 lg:hidden">
             <div className="flex justify-between items-center mb-8 shrink-0">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Kairòs Apps</h2>
                    <p className="text-slate-500 font-medium mt-1">Tutte le funzionalità</p>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <X size={24} />
                </button>
             </div>
             
             <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-24 custom-scrollbar">
                {/* NEW: UNIFIED CALENDAR BUTTON */}
                <MobileMenuButton id="calendar" label="Agenda" icon={CalendarDays} color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-900/20" />
                
                <MobileMenuButton id="goals" label="Obiettivi" icon={Target} color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-900/20" />
                <MobileMenuButton id="diet" label="Nutrizione" icon={Apple} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
                <MobileMenuButton id="workout" label="Fitness" icon={Dumbbell} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
                <MobileMenuButton id="study" label="Studio" icon={BookOpen} color="text-violet-600" bg="bg-violet-50 dark:bg-violet-900/20" />
                <MobileMenuButton id="budget" label="Finanze" icon={Wallet} color="text-teal-600" bg="bg-teal-50 dark:bg-teal-900/20" />
                <MobileMenuButton id="profile" label="Profilo" icon={User} color="text-slate-600" bg="bg-slate-50 dark:bg-slate-800" />
             </div>
          </div>
      )}

      {/* Day Summary Modal */}
      {isDayDetailModalOpen && (
          <DayDetailModal 
              date={currentDate}
              onClose={() => setIsDayDetailModalOpen(false)}
              schedule={currentData.schedule}
              tasks={allActiveTasks}
              meals={dietMeals}
              workouts={workoutSessions}
              onBatchAction={handleBatchAction}
          />
      )}

      {/* Year Calendar Modal (Still usable via mini calendar header) */}
      {isYearCalendarOpen && (
          <YearCalendar 
              selectedDate={currentDate}
              onDateSelect={handleDateSelection}
              onClose={() => setIsYearCalendarOpen(false)}
              checkForActivity={checkDayHasActivity}
          />
      )}

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex w-80 flex-col h-full rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-slate-700 shadow-2xl shadow-slate-200/50 dark:shadow-none pt-8 pb-4 px-5 select-none relative z-20 transition-colors duration-300">
          
          <div className="px-2 mb-10 flex items-center gap-3 text-slate-900 dark:text-white">
             <div className={`${theme.activeNav} text-white dark:text-slate-900 p-2.5 rounded-xl shadow-lg shadow-slate-900/20 dark:shadow-none transition-colors`}>
                <Infinity size={24} />
             </div>
             <span className="font-extrabold text-2xl tracking-tight">Kairòs</span>
          </div>

          <nav className="flex-1 overflow-y-auto no-scrollbar space-y-8 pr-2">
              <div>
                  <p className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Principale</p>
                  <div className="space-y-2">
                      <NavItem id="dashboard" label="Home" icon={Home} activeView={activeView} setActiveView={setActiveView} />
                      <NavItem id="planning" label="Inserimento" icon={PenTool} activeView={activeView} setActiveView={setActiveView} />
                      
                      {/* NEW: Unified Calendar Item */}
                      <NavItem id="calendar" label="Agenda" icon={CalendarDays} activeView={activeView} setActiveView={setActiveView} />
                      
                      <NavItem id="goals" label="Obiettivi" icon={Target} activeView={activeView} setActiveView={setActiveView} />
                  </div>
              </div>

              <div>
                  <p className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Lifestyle</p>
                  <div className="space-y-2">
                      <NavItem id="diet" label="Nutrizione" icon={Apple} activeView={activeView} setActiveView={setActiveView} />
                      <NavItem id="workout" label="Fitness" icon={Dumbbell} activeView={activeView} setActiveView={setActiveView} />
                      <NavItem id="study" label="Studio" icon={BookOpen} activeView={activeView} setActiveView={setActiveView} />
                      <NavItem id="routine" label="Routine" icon={Sun} activeView={activeView} setActiveView={setActiveView} />
                      <NavItem id="budget" label="Finanze" icon={Wallet} activeView={activeView} setActiveView={setActiveView} />
                  </div>
              </div>
          </nav>

          <div className="mb-4 bg-white/50 dark:bg-slate-800/50 p-4 rounded-3xl border border-white/60 dark:border-slate-700 shadow-sm backdrop-blur-md">
              <MiniCalendar 
                  currentDate={currentDate} 
                  onDateChange={handleDateSelection} 
                  checkForActivity={checkDayHasActivity}
                  onHeaderClick={() => setIsYearCalendarOpen(true)}
              />
          </div>

          <button 
                onClick={() => handleViewChange('profile')}
                className="px-2 py-2 flex items-center gap-3 mb-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-700 p-3 rounded-2xl border border-white/50 dark:border-slate-700 hover:border-white dark:hover:border-slate-600 transition-all text-left group"
          >
                <div className={`w-10 h-10 rounded-full ${theme.bg} flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white dark:ring-slate-700 overflow-hidden relative`}>
                    {user.photoURL ? <img src={user.photoURL} alt="user" className="w-full h-full object-cover"/> : (customName?.[0] || user.displayName?.[0] || 'O').toUpperCase()}
                    {isPremium && (
                        <div className="absolute inset-0 border-2 border-yellow-400 rounded-full animate-pulse"></div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{customName || user.displayName || 'Ospite'}</p>
                        {isPremium && <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0"></span>}
                    </div>
                    <span className={`text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:${theme.text} transition-colors flex items-center gap-1 mt-0.5`}>
                        <Settings size={10} /> Profilo
                    </span>
                </div>
          </button>

          {/* Minimal AI Footer Trigger - with ZAP icon */}
          <button 
            onClick={handleGlobalOptimization}
            disabled={loading || !hasDataToOptimize}
            className="w-full mt-2 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:opacity-100 opacity-60 transition-opacity"
          >
              <div className="flex items-center gap-2">
                  <Zap size={14} className="text-indigo-500" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Kairòs Intelligence</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {loading ? '...' : 'Ottimizza'}
              </span>
          </button>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-full lg:rounded-[2.5rem] bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl border border-white/50 dark:border-slate-700 relative shadow-2xl z-10 overflow-hidden transition-colors duration-300">
         
         {/* Top Bar (Visible everywhere EXCEPT Dashboard) */}
         {activeView !== 'dashboard' && (
             <header className={`h-16 lg:h-20 shrink-0 flex items-center justify-between px-4 lg:px-8 bg-white/30 dark:bg-slate-900/30 border-b border-white/40 dark:border-slate-700/50 backdrop-blur-md sticky top-0 z-30 transition-all`}>
                 <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
                     <div className={`lg:hidden ${theme.activeNav} text-white dark:text-slate-900 p-2 rounded-xl shadow-lg shrink-0`}>
                        <Layout size={18} />
                     </div>

                     <button 
                        onClick={() => setIsDayDetailModalOpen(true)}
                        className="min-w-0 text-left group transition-all hover:translate-x-1"
                        title="Apri riepilogo giorno"
                     >
                         <h2 className={`text-lg lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate group-hover:${theme.text} transition-colors flex items-center gap-2`}>
                            {activeView === 'planning' ? 'Inserimento' : 
                             activeView === 'calendar' ? 'Agenda' : // UPDATED LABEL
                             activeView === 'routine' ? 'Routine' : 
                             activeView === 'diet' ? 'Nutrizione' : 
                             activeView === 'workout' ? 'Fitness' : 
                             activeView === 'study' ? 'Studio' : 
                             activeView === 'budget' ? 'Budget' : 
                             activeView === 'profile' ? 'Profilo' : 'Obiettivi'}
                             <ChevronDown size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                         </h2>
                         <p className="text-[10px] lg:text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                            {activeView === 'profile' ? (customName || user.email) : currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                         </p>
                     </button>
                 </div>
                 
                 <div className="flex items-center gap-2">
                     
                     {/* AI Trigger for Mobile (Visible in Header) */}
                     <button 
                        onClick={handleGlobalOptimization}
                        disabled={loading || !hasDataToOptimize}
                        className={`lg:hidden p-2 rounded-xl transition-all ${hasDataToOptimize ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-300 bg-slate-50'}`}
                        title="Ottimizza con AI"
                     >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                     </button>

                     <button 
                        onClick={() => setShowFocusTimer(!showFocusTimer)}
                        className={`p-2 rounded-xl transition-all ${showFocusTimer ? 'bg-indigo-50 text-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700'}`}
                        title="Focus Timer"
                     >
                        <Timer size={18} />
                     </button>

                     <button onClick={() => handleViewChange('profile')} className={`lg:hidden p-2 text-slate-400 hover:${theme.text} bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700`}>
                        <User size={18} />
                     </button>

                     {activeView === 'calendar' && currentData.schedule.length > 0 && (
                         <button onClick={clearSchedule} className="hidden lg:flex text-xs font-bold text-slate-500 hover:text-red-500 items-center gap-2 transition-all px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                             <RotateCcw size={14} /> Reset
                         </button>
                     )}
                 </div>
             </header>
         )}

         {/* Content Container - Added padding bottom for mobile nav */}
         <div className="flex-1 overflow-hidden relative flex flex-col h-full pb-20 lg:pb-0">
             
             {/* VIEW: DASHBOARD (HOME) */}
             {activeView === 'dashboard' && (
                 <div className="h-full animate-in fade-in duration-500">
                     <DashboardSection 
                        user={{ ...user, displayName: customName || user.displayName }}
                        date={currentDate}
                        schedule={currentData.schedule}
                        tasks={allActiveTasks}
                        transactions={transactions}
                        routineProgress={routineProgress}
                        onNavigate={handleViewChange}
                        onGenerate={handleGlobalOptimization}
                        isGenerating={loading}
                        weather={weather}
                        streak={currentStreak} 
                     />
                 </div>
             )}

             {/* VIEW: UNIFIED CALENDAR (Replaces Schedule & Weekly) */}
             {activeView === 'calendar' && (
                 <div className="h-full p-4 lg:p-8 animate-in fade-in duration-500 overflow-hidden">
                     {loading && (loadingStage.includes('Analisi') || loadingStage.includes('Generazione')) ? (
                         <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-30 flex-col gap-6">
                            <div className="relative">
                                <div className={`w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-${accentColor}-600 animate-spin`}></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={24} className={`text-${accentColor}-600 animate-pulse`} />
                                </div>
                            </div>
                            <p className="text-lg font-bold text-slate-700 dark:text-slate-200 animate-pulse">{loadingStage || 'Elaborazione...'}</p>
                        </div>
                     ) : (
                        <CalendarSection 
                            currentDate={currentDate}
                            onDateChange={handleDateSelection}
                            schedule={currentData.schedule}
                            getEventsForWeek={getEventsForWeek}
                            onEventClick={handleEventClick}
                            daysData={daysData}
                            checkForActivity={checkDayHasActivity}
                        />
                     )}
                 </div>
             )}

             {/* VIEW: PLANNING */}
             {activeView === 'planning' && (
                 <div className="h-full overflow-y-auto custom-scrollbar p-4 lg:p-10 animate-in slide-in-from-bottom-4 duration-500 pb-28 lg:pb-0">
                     <div className="max-w-5xl mx-auto space-y-6 lg:space-y-10">
                         
                         {/* Unified Input Card */}
                         <div className="animate-in fade-in duration-700">
                             <UnifiedActivityInput currentDate={currentDate} onAddEvent={addFixedEvent} onAddTask={addTask} />
                         </div>
                         
                         <div className="grid md:grid-cols-2 gap-4 lg:gap-8">
                             <div className="bg-white/60 dark:bg-slate-800/60 p-4 lg:p-6 rounded-3xl border border-white/60 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-md">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 mb-4 flex items-center gap-2">
                                    <Clock size={14} /> Appuntamenti Fissi
                                </h3>
                                <FixedEventList 
                                    events={agendaEvents} 
                                    onRemoveEvent={removeFixedEvent} 
                                    onEventClick={handleEventClick}
                                />
                             </div>

                             <div className="bg-white/60 dark:bg-slate-800/60 p-4 lg:p-6 rounded-3xl border border-white/60 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-md">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 mb-4 flex items-center gap-2">
                                    <ListTodo size={14} /> Cose da fare
                                </h3>
                                <TaskList tasks={agendaTasks} onRemoveTask={removeTask} />
                             </div>
                         </div>
                     </div>
                 </div>
             )}

             {/* VIEW: ROUTINE (INCLUDES WELLNESS) */}
             {activeView === 'routine' && (
                <div className="h-full animate-in slide-in-from-right-2 duration-300">
                    <RoutineSection 
                        currentDate={currentDate}
                        routineEvents={routineEvents}
                        routineTasks={routineTasks}
                        onAddFixed={(title, start, end, category, details, recurrence, attachments, targetDate) => 
                            addFixedEvent(title, start, end, category, details, recurrence, attachments, targetDate)
                        }
                        onAddTask={(title, type, category, minutes, isSplittable, minChunkMinutes, attachments, recurrence, preferredTime, details) => 
                            addTask(title, type, category, minutes, isSplittable, minChunkMinutes, attachments, recurrence, preferredTime, details)
                        }
                        onRemoveEvent={removeFixedEvent}
                        onRemoveTask={removeTask}
                        onToggleTaskCompletion={toggleTaskCompletion}
                        wellnessEntries={wellnessEntries}
                        onAddWellnessEntry={addWellnessEntry}
                    />
                </div>
             )}

             {/* VIEW: DIET */}
             {activeView === 'diet' && (
                 <div className="h-full animate-in slide-in-from-right-2 duration-300">
                     <DietSection 
                        date={currentDate} 
                        meals={dietMeals} 
                        onAddMeal={(title, start, end, category, details, recurrence, attachments, targetDate, nutritionalInfo) => 
                            addFixedEvent(title, start, end, category, details, recurrence, attachments, targetDate, undefined, undefined, nutritionalInfo)
                        } 
                        onRemoveMeal={removeFixedEvent} 
                        subscriptions={subscriptions} 
                     />
                 </div>
             )}

             {/* VIEW: WORKOUT */}
             {activeView === 'workout' && (
                 <div className="h-full animate-in slide-in-from-right-2 duration-300">
                     <WorkoutSection 
                        date={currentDate}
                        workouts={workoutSessions}
                        onAddWorkout={(title, start, end, category, details, recurrence, attachments, targetDate, workoutInfo) => 
                            addFixedEvent(title, start, end, category, details, recurrence, attachments, targetDate, undefined, undefined, undefined, workoutInfo)
                        }
                        onRemoveWorkout={removeFixedEvent}
                        subscriptions={subscriptions} 
                     />
                 </div>
             )}

             {/* VIEW: STUDY */}
             {activeView === 'study' && (
                 <div className="h-full animate-in slide-in-from-right-2 duration-300">
                     <StudySection 
                        date={currentDate}
                        studySessions={studySessions}
                        onAddStudySession={(title, start, end, category, details, recurrence, attachments, targetDate, studyInfo) => 
                            addFixedEvent(title, start, end, category, details, recurrence, attachments, targetDate, undefined, undefined, undefined, undefined, studyInfo)
                        }
                        onRemoveStudySession={removeFixedEvent}
                        subscriptions={subscriptions} 
                     />
                 </div>
             )}

             {/* VIEW: BUDGET */}
             {activeView === 'budget' && (
                 <div className="h-full animate-in slide-in-from-right-2 duration-300">
                     <BudgetSection 
                        currentDate={currentDate}
                        transactions={transactions}
                        onAddTransaction={addTransaction}
                        onRemoveTransaction={removeTransaction}
                        savingsGoals={savingsGoals}
                        onAddSavingsGoal={addSavingsGoal}
                        onUpdateSavingsGoal={updateSavingsGoal}
                        onRemoveSavingsGoal={removeSavingsGoal}
                        subscriptions={subscriptions}
                        onAddSubscription={addSubscription}
                        onRemoveSubscription={removeSubscription}
                     />
                 </div>
             )}

             {/* VIEW: PROFILE */}
             {activeView === 'profile' && (
                 <div className="h-full animate-in slide-in-from-right-2 duration-300">
                     <ProfileSection 
                        user={user}
                        onLogout={handleLogout}
                        darkMode={darkMode}
                        toggleDarkMode={toggleDarkMode}
                        soundEnabled={soundEnabled}
                        toggleSound={toggleSound}
                        notificationsEnabled={notificationsEnabled}
                        toggleNotifications={toggleNotifications}
                        accentColor={accentColor}
                        setAccentColor={setAccentColor}
                        customName={customName}
                        setCustomName={setCustomName}
                        tasks={Object.values(daysData).flatMap((d: DayData) => d.tasks)}
                        events={Object.values(daysData).flatMap((d: DayData) => d.fixedEvents)}
                        wellnessEntries={wellnessEntries}
                        streak={currentStreak}
                        isPremium={isPremium}
                        onUpgradeToPremium={() => {
                            // If admin, this acts as a toggle. If user, it acts as legacy
                            setIsPremium(true); 
                            localStorage.setItem('kairos_subscription', 'pro');
                            addToast('Benvenuto in Kairòs Pro!', 'success');
                            if(soundEnabled) playSound.success();
                        }}
                        settings={settings}
                        updateSettings={updateSettings}
                        onUpdateUser={handleUpdateUser} 
                        isAdmin={user && isAdminUser} // Pass memoized admin status
                        onTogglePremiumManual={() => {
                            const newState = !isPremium;
                            setIsPremium(newState);
                            if (newState) {
                                localStorage.setItem('kairos_subscription', 'pro');
                                addToast('Premium Attivato (Dev)', 'success');
                            } else {
                                localStorage.removeItem('kairos_subscription');
                                addToast('Premium Disattivato (Dev)', 'info');
                            }
                        }}
                     />
                 </div>
             )}

             {/* VIEW: GOALS */}
             {activeView === 'goals' && (
                 <div className="h-full overflow-y-auto custom-scrollbar p-4 lg:p-8 animate-in slide-in-from-right-4 duration-300 pb-28 lg:pb-0">
                     <div className="max-w-4xl mx-auto">
                         <GoalInput 
                            goals={goals} 
                            onAddGoal={handleAddGoal} 
                            onRemoveGoal={removeGoal} 
                            onToggleStep={toggleGoalStep} 
                         />
                     </div>
                 </div>
             )}
         </div>

         {/* --- MOBILE BOTTOM NAVIGATION (Floating) --- */}
         <nav className="lg:hidden fixed bottom-4 left-4 right-4 h-16 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/50 dark:border-slate-700 rounded-2xl shadow-2xl shadow-slate-300/50 dark:shadow-none flex justify-around items-center px-1 z-50 transition-colors">
            
            <button 
                onClick={() => handleViewChange('dashboard')} 
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl gap-0.5 transition-all duration-300 active:scale-90 ${activeView === 'dashboard' ? `${theme.activeNav} text-white shadow-lg translate-y-[-4px]` : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <Home size={20} strokeWidth={activeView === 'dashboard' ? 2.5 : 2} />
            </button>

            <button 
                onClick={() => handleViewChange('calendar')} 
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl gap-0.5 transition-all duration-300 active:scale-90 ${activeView === 'calendar' ? `${theme.activeNav} text-white shadow-lg translate-y-[-4px]` : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <Clock size={20} strokeWidth={activeView === 'calendar' ? 2.5 : 2} />
            </button>

            <button 
                onClick={() => handleViewChange('planning')} 
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-0.5 transition-all duration-300 -mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/30 active:scale-95 ${activeView === 'planning' ? 'scale-110' : ''}`}
            >
                <Plus size={24} strokeWidth={2.5} />
            </button>
            
            <button 
                onClick={() => handleViewChange('routine')} 
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl gap-0.5 transition-all duration-300 active:scale-90 ${activeView === 'routine' ? `${theme.activeNav} text-white shadow-lg translate-y-[-4px]` : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <Sun size={20} strokeWidth={activeView === 'routine' ? 2.5 : 2} />
            </button>

            <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl gap-0.5 transition-all duration-300 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 active:scale-90`}
            >
                <LayoutGrid size={20} />
            </button>
         </nav>

      </main>
    </div>
  );
}

export default App;
