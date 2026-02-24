
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Clock, Sun, Sunset, Moon, Repeat, Loader2, Trash2, CheckCircle2, Paperclip, Settings, X, Save, UploadCloud, ChevronDown, ChevronUp, Zap, Sunrise, Check, Circle, Trophy, Heart, Smile, Meh, Battery, Book, Sparkles } from 'lucide-react';
import { FixedEvent, Task, EventCategory, UploadedFile, TaskType, WellnessEntry, MoodType } from '../types';
import { analyzeRoutinePlan } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { playSound } from '../services/soundService';

interface RoutineSectionProps {
  currentDate: Date;
  routineEvents: FixedEvent[];
  routineTasks: Task[];
  onAddFixed: (title: string, start: string, end: string, category: EventCategory, details: string, recurrence: number[], attachments: UploadedFile[], targetDate?: string) => void;
  onAddTask: (title: string, type: TaskType, category: EventCategory, minutes: number, isSplittable: boolean, minChunkMinutes: number, attachments: UploadedFile[], recurrence?: number[], preferredTime?: 'morning' | 'afternoon' | 'evening' | 'any', details?: string) => void;
  onRemoveEvent: (id: string) => void;
  onRemoveTask: (id: string) => void;
  onToggleTaskCompletion?: (id: string) => void;
  // Wellness Props
  wellnessEntries: WellnessEntry[];
  onAddWellnessEntry: (entry: WellnessEntry) => void;
}

export const RoutineSection: React.FC<RoutineSectionProps> = ({ 
    currentDate, routineEvents, routineTasks, 
    onAddFixed, onAddTask, onRemoveEvent, onRemoveTask,
    onToggleTaskCompletion, wellnessEntries, onAddWellnessEntry
}) => {
  const [activeTab, setActiveTab] = useState<'habits' | 'journal'>('habits');
  const [loading, setLoading] = useState(false);
  const [importingPlan, setImportingPlan] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  
  // Goal Editing State
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [routineGoals, setRoutineGoals] = useState({
      habitsGoal: 5,
      focusMinutes: 60,
      sleepHours: 7.5
  });

  // Habit Input State
  const [habitTitle, setHabitTitle] = useState('');
  const [habitTime, setHabitTime] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
  // Wellness Input State
  const dateKey = currentDate.toISOString().split('T')[0];
  const todayEntry = wellnessEntries.find(e => e.date === dateKey);
  const [mood, setMood] = useState<MoodType>(todayEntry?.mood || 'Neutral');
  const [energy, setEnergy] = useState(todayEntry?.energyLevel || 5);
  const [gratitude, setGratitude] = useState(todayEntry?.gratitude || ['', '', '']);
  const [notes, setNotes] = useState(todayEntry?.notes || '');
  
  const planInputRef = useRef<HTMLInputElement>(null);

  // --- STATS ---
  const stats = useMemo(() => {
      const allItems = [...routineEvents, ...routineTasks];
      const completedTasks = routineTasks.filter(t => t.completed).length;
      const progress = Math.min((completedTasks / routineGoals.habitsGoal) * 100, 100);

      return {
          count: allItems.length,
          completedCount: completedTasks,
          progress,
          morning: allItems.filter(i => {
              if ('startTime' in i) return parseInt(i.startTime.split(':')[0]) < 12;
              return (i as Task).preferredTime === 'morning';
          }).length,
          afternoon: allItems.filter(i => {
              if ('startTime' in i) { const h = parseInt(i.startTime.split(':')[0]); return h >= 12 && h < 18; }
              return (i as Task).preferredTime === 'afternoon';
          }).length,
          evening: allItems.filter(i => {
              if ('startTime' in i) { const h = parseInt(i.startTime.split(':')[0]); return h >= 18; }
              return (i as Task).preferredTime === 'evening';
          }).length
      };
  }, [routineEvents, routineTasks, routineGoals.habitsGoal]);

  // --- HANDLERS ---

  const handleAddHabit = (e: React.FormEvent, overrideTitle?: string) => {
      e?.preventDefault();
      const titleToUse = overrideTitle || habitTitle;
      if (!titleToUse.trim() && attachments.length === 0) return;

      onAddTask(titleToUse, 'Flessibile', 'personal', 30, false, 30, attachments, [], habitTime);
      setHabitTitle('');
      setAttachments([]);
      setIsInputOpen(false);
      playSound.success();
  };

  const handleSaveJournal = () => {
      onAddWellnessEntry({
          id: todayEntry?.id || crypto.randomUUID(),
          date: dateKey,
          mood,
          energyLevel: energy,
          gratitude: gratitude.filter(Boolean),
          notes
      });
      playSound.success();
  };

  const handleUpdateGoals = (e: React.FormEvent) => {
      e.preventDefault();
      setIsEditingGoals(false);
  };

  const handlePlanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      setImportingPlan(true);
      try {
          const file = files[0];
          const base64Data = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64String = reader.result as string;
                  resolve(base64String.split(',')[1]);
              };
              reader.readAsDataURL(file);
          });

          const uploadedFile: UploadedFile = {
              name: file.name,
              mimeType: file.type,
              data: base64Data
          };

          const planData = await analyzeRoutinePlan([uploadedFile]);

          if (planData.goals) {
              setRoutineGoals({
                  habitsGoal: planData.goals.habitsToComplete || 5,
                  focusMinutes: planData.goals.focusMinutes || 60,
                  sleepHours: planData.goals.sleepHours || 7.5
              });
          }

          if (planData.habits && planData.habits.length > 0) {
              planData.habits.forEach(habit => {
                  if (habit.type === 'fixed' && habit.startTime) {
                      const [h, m] = habit.startTime.split(':').map(Number);
                      const dur = habit.durationMinutes || 30;
                      const totalMins = h * 60 + m + dur;
                      const endTime = `${Math.floor(totalMins / 60) % 24}:${(totalMins % 60).toString().padStart(2, '0')}`;
                      onAddFixed(habit.title, habit.startTime, endTime, 'personal', habit.details, [], [uploadedFile], currentDate.toISOString().split('T')[0]);
                  } else {
                      onAddTask(habit.title, 'Flessibile', 'personal', habit.durationMinutes || 30, false, 30, [uploadedFile], [], habit.timeOfDay as any || 'any', habit.details);
                  }
              });
          }

      } catch (error) {
          console.error("Import error", error);
          alert("Errore durante l'importazione del piano.");
      } finally {
          setImportingPlan(false);
          if (planInputRef.current) planInputRef.current.value = ''; 
      }
  };

  const QuickAddItem = ({ label }: { label: string }) => (
      <button type="button" onClick={(e) => handleAddHabit(e as any, label)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-95">{label}</button>
  );

  // --- UI COMPONENTS ---
  
  const RoutineRing = () => {
      const size = 160; 
      const center = size / 2;
      const strokeWidth = 12;
      const radius = center - strokeWidth;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (stats.progress / 100) * circumference;

      return (
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
              <svg className="transform -rotate-90 w-full h-full">
                  <circle cx={center} cy={center} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
                  <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-indigo-600 transition-all duration-1000 ease-out" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {stats.progress >= 100 ? (
                      <div className="flex flex-col items-center animate-in zoom-in duration-300">
                          <Trophy size={32} className="text-yellow-400 mb-1 drop-shadow-sm" />
                          <span className="text-xs font-bold text-indigo-900 uppercase">Ottimo!</span>
                      </div>
                  ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{stats.completedCount}</span>
                            <span className="text-sm font-bold text-slate-400">/ {routineGoals.habitsGoal}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Completati</span>
                      </>
                  )}
              </div>
          </div>
      );
  };

  const HabitItem = ({ item, isTask, onToggle, onRemove }: any) => {
      const isCompleted = isTask && item.completed;
      const [isAnimating, setIsAnimating] = useState(false);

      const handleClick = () => {
          if (!isTask) return;
          if (!isCompleted) {
              setIsAnimating(true);
              setTimeout(() => setIsAnimating(false), 300);
          }
          onToggle(item.id);
      };

      return (
          <div className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${isCompleted ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100 hover:shadow-md'}`}>
              <button 
                onClick={handleClick} 
                disabled={!isTask} 
                className={`p-2 rounded-xl transition-all duration-300 transform active:scale-90 flex items-center justify-center relative ${isAnimating ? 'scale-125' : ''} ${isCompleted ? 'bg-indigo-500 text-white shadow-md rotate-0' : isTask ? 'bg-slate-50 text-slate-300 hover:bg-indigo-100 hover:text-indigo-500 shadow-sm' : 'bg-slate-100 text-slate-300 cursor-default'}`}
              >
                  {isCompleted ? <Check size={18} strokeWidth={3} /> : <Circle size={18} />}
                  {isAnimating && <span className="absolute inset-0 rounded-xl bg-indigo-400 animate-ping opacity-75"></span>}
              </button>
              <div className="flex-1 min-w-0">
                  <h4 className={`font-bold text-sm transition-colors ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{'startTime' in item ? `${item.startTime} (Fisso)` : item.details || 'Flessibile'}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
          </div>
      );
  }

  const HabitGroup = ({ title, icon: Icon, color, filter }: any) => {
      const items = [...routineEvents, ...routineTasks].filter(i => {
          if ('startTime' in i) {
              const h = parseInt(i.startTime.split(':')[0]);
              if (filter === 'morning') return h < 12;
              if (filter === 'afternoon') return h >= 12 && h < 18;
              if (filter === 'evening') return h >= 18;
              return false;
          }
          if ('preferredTime' in i) return i.preferredTime === filter;
          return false;
      });

      if (items.length === 0) return null;

      return (
          <div className="mb-6">
              <h3 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 ${color}`}><Icon size={14} /> {title}</h3>
              <div className="space-y-2">
                  {items.map((item) => (
                      <HabitItem 
                        key={item.id} 
                        item={item} 
                        isTask={!('startTime' in item)} 
                        onToggle={onToggleTaskCompletion} 
                        onRemove={'startTime' in item ? onRemoveEvent : onRemoveTask}
                      />
                  ))}
              </div>
          </div>
      );
  }

  // --- JOURNAL SUB-COMPONENT ---
  const JournalView = () => {
      const MOODS: { type: MoodType, icon: any, label: string, color: string }[] = [
          { type: 'Amazing', icon: Heart, label: 'Top', color: 'text-rose-500 bg-rose-50 border-rose-200' },
          { type: 'Good', icon: Smile, label: 'Bene', color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
          { type: 'Neutral', icon: Meh, label: 'Ok', color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
          { type: 'Tired', icon: Battery, label: 'No', color: 'text-amber-500 bg-amber-50 border-amber-200' },
      ];

      // Dynamic color for slider
      const getEnergyColor = (val: number) => {
          if (val <= 3) return 'accent-red-500';
          if (val <= 7) return 'accent-amber-500';
          return 'accent-emerald-500';
      };
      const getEnergyText = (val: number) => {
          if (val <= 3) return 'text-red-500';
          if (val <= 7) return 'text-amber-500';
          return 'text-emerald-500';
      };

      return (
          <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* MOOD & ENERGY CARD */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Vibe Check</h3>
                  <div className="flex justify-between items-center mb-8">
                      {MOODS.map(m => (
                          <button 
                            key={m.type} 
                            onClick={() => { setMood(m.type); playSound.click(); }}
                            className={`flex flex-col items-center gap-2 transition-all duration-300 group ${mood === m.type ? 'scale-110 -translate-y-1' : 'opacity-60 hover:opacity-100'}`}
                          >
                              <div className={`p-4 rounded-2xl border-2 transition-all ${mood === m.type ? `${m.color} shadow-lg` : 'bg-slate-50 border-transparent text-slate-400 group-hover:bg-white group-hover:border-slate-100'}`}>
                                  <m.icon size={28} strokeWidth={mood === m.type ? 3 : 2} className="transition-transform group-active:scale-90" />
                              </div>
                              <span className={`text-[10px] font-bold ${mood === m.type ? 'text-slate-800' : 'text-slate-400'}`}>{m.label}</span>
                          </button>
                      ))}
                  </div>
                  
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-3">
                          <span>Livello Energia</span>
                          <span className={`text-base font-black ${getEnergyText(energy)} transition-colors`}>{energy}/10</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" max="10" 
                        value={energy} 
                        onChange={(e) => setEnergy(Number(e.target.value))} 
                        className={`w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer transition-all ${getEnergyColor(energy)}`} 
                      />
                      <div className="flex justify-between mt-2 px-1">
                          <span className="text-[10px] text-slate-400">Scarico</span>
                          <span className="text-[10px] text-slate-400">Carico</span>
                      </div>
                  </div>
              </div>

              {/* GRATITUDE CARD */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles size={14} className="text-yellow-400 fill-yellow-400" />
                      3 Cose Belle
                  </h3>
                  <div className="space-y-3">
                      {[0, 1, 2].map(i => (
                          <div key={i} className="flex items-center gap-3 group focus-within:translate-x-1 transition-transform">
                              <span className="text-emerald-200 group-focus-within:text-emerald-400 font-black text-sm transition-colors">{i + 1}.</span>
                              <input 
                                type="text" 
                                value={gratitude[i]} 
                                onChange={(e) => { const newG = [...gratitude]; newG[i] = e.target.value; setGratitude(newG); }}
                                placeholder={i === 0 ? "Un piccolo successo..." : i === 1 ? "Una persona..." : "Un momento..."}
                                className="w-full bg-slate-50 border border-transparent focus:border-emerald-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:bg-white focus:shadow-sm placeholder:text-slate-300"
                              />
                          </div>
                      ))}
                  </div>
              </div>

              {/* NOTES CARD */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Book size={14}/> Diario Libero</h3>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Riflessioni del giorno..." 
                    className="w-full h-32 bg-slate-50 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none resize-none focus:ring-2 focus:ring-indigo-100 transition-all border border-transparent focus:bg-white"
                  />
              </div>

              <button onClick={handleSaveJournal} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2 hover:shadow-2xl">
                  <Save size={18} /> Salva Diario
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-y-auto pb-20 lg:pb-0 scroll-smooth">
        
        {/* DASHBOARD AREA */}
        <div className="bg-white p-6 lg:p-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 z-10 relative">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Routine & Life</h2>
                    <p className="text-sm font-medium text-slate-400 flex items-center gap-1">
                        <Sun size={14} /> Design your day
                    </p>
                </div>
                
                {/* Tab Switcher */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button onClick={() => setActiveTab('habits')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'habits' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Abitudini</button>
                    <button onClick={() => setActiveTab('journal')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'journal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Journal</button>
                </div>
            </div>

            {/* Content Switch based on Tab */}
            {activeTab === 'habits' ? (
                <>
                    {isEditingGoals ? (
                        <form onSubmit={handleUpdateGoals} className="max-w-xl mx-auto animate-in fade-in slide-in-from-top-2 py-4">
                            {/* Goals Form (Same as before) */}
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Numero Abitudini Target</label>
                                    <input type="number" value={routineGoals.habitsGoal} onChange={e => setRoutineGoals({...routineGoals, habitsGoal: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-800 text-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Ore di Sonno Ideali</label>
                                    <input type="number" value={routineGoals.sleepHours} onChange={e => setRoutineGoals({...routineGoals, sleepHours: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none" />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-colors mt-8 shadow-xl shadow-slate-200">
                                <Save size={18} /> Salva Obiettivi
                            </button>
                        </form>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-stretch animate-in fade-in duration-300">
                            <div className="flex flex-col items-center gap-4">
                                <RoutineRing />
                            </div>
                            <div className="flex-1 w-full">
                                {/* Habit Bars & Actions */}
                                <div className="w-full flex flex-col justify-center h-full gap-4">
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Moon size={12} /> Sonno Target</span>
                                            <span className="text-xs font-black text-slate-700">{routineGoals.sleepHours}h</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: '80%' }}></div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full justify-end">
                                        <input type="file" ref={planInputRef} onChange={handlePlanFileChange} className="hidden" accept="application/pdf,image/*" />
                                        <button onClick={() => planInputRef.current?.click()} disabled={importingPlan} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                                            {importingPlan ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />} Importa
                                        </button>
                                        <button onClick={() => setIsEditingGoals(true)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"><Settings size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-6 animate-in fade-in duration-300">
                    <p className="text-sm font-medium text-slate-500 italic">"Conosci te stesso."</p>
                </div>
            )}
        </div>

        {/* INPUT & LIST CONTAINER */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 pt-8">
            
            {activeTab === 'habits' ? (
                <>
                    {/* HABIT INPUT */}
                    <div className={`bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-white overflow-hidden transition-all duration-500 ${isInputOpen ? 'ring-4 ring-slate-50' : ''}`}>
                        {!isInputOpen ? (
                            <div className="p-2 flex items-center gap-2">
                                <button onClick={() => setIsInputOpen(true)} className="flex-1 bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl flex items-center gap-4 transition-colors group text-left">
                                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-300 group-hover:scale-105 transition-transform"><Plus size={24} /></div>
                                    <div>
                                        <span className="font-bold text-slate-800 block text-lg">Nuova Abitudine</span>
                                        <span className="text-xs text-slate-400 font-medium">Crea una routine vincente</span>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="p-6 animate-in slide-in-from-top-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Zap size={20} className="text-indigo-500" /> Habit Builder</h3>
                                    <button onClick={() => setIsInputOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><ChevronUp size={20} /></button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
                                    <QuickAddItem label="Meditazione" />
                                    <QuickAddItem label="Lettura" />
                                    <QuickAddItem label="Journaling" />
                                    <QuickAddItem label="Stretching" />
                                </div>
                                <form onSubmit={(e) => handleAddHabit(e)}>
                                    <div className="flex gap-4 mb-4">
                                        <input type="text" value={habitTitle} onChange={(e) => setHabitTitle(e.target.value)} placeholder="Es. Bere 2L acqua" className="flex-1 bg-slate-50 rounded-2xl px-5 py-4 text-lg font-bold text-slate-900 placeholder-slate-300 focus:outline-none border-2 border-transparent focus:border-slate-900 focus:bg-white transition-all" autoFocus />
                                        <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                                            <button type="button" onClick={() => setHabitTime('morning')} className={`p-3 rounded-xl transition-all ${habitTime === 'morning' ? 'bg-white shadow-sm text-orange-500' : 'text-slate-400'}`}><Sunrise size={20} /></button>
                                            <button type="button" onClick={() => setHabitTime('afternoon')} className={`p-3 rounded-xl transition-all ${habitTime === 'afternoon' ? 'bg-white shadow-sm text-amber-500' : 'text-slate-400'}`}><Sun size={20} /></button>
                                            <button type="button" onClick={() => setHabitTime('evening')} className={`p-3 rounded-xl transition-all ${habitTime === 'evening' ? 'bg-white shadow-sm text-indigo-500' : 'text-slate-400'}`}><Sunset size={20} /></button>
                                        </div>
                                    </div>
                                    <FileUploader uploadedFiles={attachments} onFileUpload={setAttachments} onFileRemove={(i) => setAttachments(prev => prev.filter((_, idx) => idx !== i))} />
                                    <button type="submit" disabled={(!habitTitle.trim() && attachments.length === 0) || loading} className="w-full mt-4 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-70 disabled:shadow-none hover:-translate-y-0.5">
                                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />} Aggiungi alla Routine
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* HABIT LISTS */}
                    <div>
                        {stats.count === 0 ? (
                            <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Sun size={32} className="text-slate-300" /></div>
                                <p className="text-slate-500 font-bold text-sm">Nessuna routine definita.</p>
                            </div>
                        ) : (
                            <>
                                <HabitGroup title="Morning Routine" icon={Sunrise} color="text-orange-500" filter="morning" />
                                <HabitGroup title="Afternoon Flow" icon={Sun} color="text-amber-500" filter="afternoon" />
                                <HabitGroup title="Evening Wind-down" icon={Moon} color="text-indigo-500" filter="evening" />
                            </>
                        )}
                    </div>
                </>
            ) : (
                // JOURNAL TAB
                <div className="max-w-2xl mx-auto">
                    <JournalView />
                </div>
            )}
        </div>
    </div>
  );
};
