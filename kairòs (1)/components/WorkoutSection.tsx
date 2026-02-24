
import React, { useState, useMemo, useRef } from 'react';
import { Dumbbell, Plus, Flame, Clock, Trophy, ChevronRight, Activity, Zap, Loader2, Trash2, Calendar, Target, Paperclip, BarChart3, Play, ScanLine, CheckCircle2, Settings, X, Save, UploadCloud, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import { FixedEvent, WorkoutInfo, EventCategory, UploadedFile, Subscription } from '../types';
import { calculateWorkoutDetails, analyzeWorkoutPlan } from '../services/geminiService';
import { FileUploader } from './FileUploader';

interface WorkoutSectionProps {
  date: Date;
  workouts: FixedEvent[];
  onAddWorkout: (title: string, start: string, end: string, category: EventCategory, details: string, recurrence: number[], attachments: UploadedFile[], targetDate?: string, workoutInfo?: WorkoutInfo) => void;
  onRemoveWorkout: (id: string) => void;
  subscriptions?: Subscription[];
}

export const WorkoutSection: React.FC<WorkoutSectionProps> = ({ date, workouts, onAddWorkout, onRemoveWorkout, subscriptions = [] }) => {
  const [loading, setLoading] = useState(false);
  const [importingPlan, setImportingPlan] = useState(false);
  
  const [workoutInput, setWorkoutInput] = useState('');
  const [workoutTime, setWorkoutTime] = useState('18:00');
  const [duration, setDuration] = useState(60);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  // Goal Editing State
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [fitnessGoals, setFitnessGoals] = useState({ 
      workoutsPerWeek: 4, 
      activeMinutes: 60, 
      caloriesBurn: 500 
  });
  
  // Hidden input ref for plan import
  const planInputRef = useRef<HTMLInputElement>(null);

  const activeSubs = useMemo(() => subscriptions.filter(s => s.category === 'Health'), [subscriptions]);

  const stats = useMemo(() => {
    return workouts.reduce((acc, w) => {
        const info = w.workoutInfo || { estimatedCalories: 0, exercises: [], muscleGroup: 'Misto', intensity: 'Media' };
        const [sh, sm] = w.startTime.split(':').map(Number);
        const [eh, em] = w.endTime.split(':').map(Number);
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        return {
            calories: acc.calories + (info.estimatedCalories || 0),
            minutes: acc.minutes + (mins > 0 ? mins : 60),
            count: acc.count + 1,
            mainGroup: info.muscleGroup
        };
    }, { calories: 0, minutes: 0, count: 0, mainGroup: '-' });
  }, [workouts]);

  const handleAddWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutInput.trim() && attachments.length === 0) return;
    setLoading(true);
    try {
        const workoutDetails = await calculateWorkoutDetails(workoutInput, attachments);
        const title = `Allenamento: ${workoutDetails.muscleGroup}`;
        const [h, m] = workoutTime.split(':').map(Number);
        const totalMins = h * 60 + m + duration;
        const endH = Math.floor(totalMins / 60) % 24;
        const endM = totalMins % 60;
        const endTime = `${endH.toString().padStart(2,'0')}:${endM.toString().padStart(2,'0')}`;
        const detailsString = workoutDetails.exercises.map(ex => `${ex.name} ${ex.sets}x${ex.reps}`).join(', ');

        onAddWorkout(
            title, workoutTime, endTime, 'workout', detailsString, [], attachments, date.toISOString().split('T')[0], workoutDetails
        );
        setWorkoutInput('');
        setAttachments([]);
        setIsInputOpen(false);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpdateGoals = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingGoals(false);
  };

  // UPDATED: Logic to import full WEEKLY recurring workout plan
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

          const planData = await analyzeWorkoutPlan([uploadedFile]);

          if (planData.goals) {
              setFitnessGoals({
                  workoutsPerWeek: planData.goals.workoutsPerWeek || 4,
                  activeMinutes: planData.goals.activeMinutesPerDay || 60,
                  caloriesBurn: planData.goals.dailyCaloriesBurnGoal || 500
              });
          }

          if (planData.weeklySchedule && planData.weeklySchedule.length > 0) {
              // Iterate through the full weekly schedule extracted by AI
              planData.weeklySchedule.forEach(w => {
                  const startTime = "18:00"; // Default time if not specified
                  const dur = w.durationMinutes || 60;
                  const [h, m] = startTime.split(':').map(Number);
                  const totalMins = h * 60 + m + dur;
                  const endTime = `${Math.floor(totalMins / 60) % 24}:${(totalMins % 60).toString().padStart(2, '0')}`;
                  
                  const workoutInfo: WorkoutInfo = {
                      muscleGroup: w.muscleGroup || 'Full Body',
                      intensity: w.intensity || 'Media',
                      estimatedCalories: 400, 
                      exercises: w.exercises || []
                  };

                  const details = w.exercises.map(e => `${e.name} ${e.sets}x${e.reps}`).join(', ');

                  // IMPORTANT: Pass recurrence array!
                  // w.dayIndex (0=Sun, 1=Mon...) corresponds to standard recurrence format
                  onAddWorkout(
                      w.title || `Scheda: ${w.muscleGroup}`,
                      startTime,
                      endTime,
                      'workout',
                      details,
                      [w.dayIndex], // Set recurrence to repeat every week on this day
                      [uploadedFile],
                      undefined, // No target specific date, relies on recurrence
                      workoutInfo
                  );
              });
              alert(`Programma settimanale importato! ${planData.weeklySchedule.length} sessioni ricorrenti aggiunte.`);
          } else {
              alert("Non sono riuscito a estrarre una scheda settimanale chiara. Riprova con un'immagine più leggibile.");
          }

      } catch (error) {
          console.error("Import error", error);
          alert("Errore durante l'importazione della scheda.");
      } finally {
          setImportingPlan(false);
          if (planInputRef.current) planInputRef.current.value = ''; 
      }
  };

  // --- DASHBOARD COMPONENTS ---
  
  const WorkoutRing = () => {
      const size = 160; 
      const center = size / 2;
      const strokeWidth = 12;
      const radius = center - strokeWidth;
      const circumference = 2 * Math.PI * radius;
      
      // Simple mock for weekly progress - in a real app would calculate from history
      const weeklyProgress = Math.min(stats.count / fitnessGoals.workoutsPerWeek, 1); 
      const strokeDashoffset = circumference - weeklyProgress * circumference;

      return (
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
              <svg className="transform -rotate-90 w-full h-full">
                  <circle cx={center} cy={center} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
                  <circle 
                    cx={center} cy={center} r={radius} 
                    stroke="currentColor" 
                    strokeWidth={strokeWidth} 
                    fill="transparent" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                    className="text-orange-500 transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{stats.count}</span>
                    <span className="text-xl font-bold text-slate-400">/{fitnessGoals.workoutsPerWeek}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Settimanali</span>
              </div>
          </div>
      );
  };

  const ActivityBars = () => (
      <div className="w-full flex flex-col justify-center h-full gap-4">
          
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
             <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                     <Clock size={12} /> Minuti Attivi
                 </span>
                 <span className="text-xs font-black text-slate-700">{stats.minutes} / {fitnessGoals.activeMinutes}</span>
             </div>
             <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((stats.minutes / fitnessGoals.activeMinutes) * 100, 100)}%` }}></div>
             </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
             <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                     <Flame size={12} /> Calorie (Kcal)
                 </span>
                 <span className="text-xs font-black text-slate-700">{Math.round(stats.calories)} / {fitnessGoals.caloriesBurn}</span>
             </div>
             <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                 <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min((stats.calories / fitnessGoals.caloriesBurn) * 100, 100)}%` }}></div>
             </div>
          </div>

          {activeSubs.length > 0 && (
              <div className="bg-orange-50 border border-orange-100 p-2 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 px-1">
                      <CreditCard size={14} className="text-orange-500" />
                      <span className="text-[10px] font-bold text-orange-700 uppercase">Active Memberships</span>
                  </div>
                  <div className="flex gap-1">
                      {activeSubs.map(s => (
                          <span key={s.id} className="text-[9px] font-bold bg-white text-orange-600 px-2 py-1 rounded-lg border border-orange-200">{s.name}</span>
                      ))}
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-y-auto pb-20 lg:pb-0 scroll-smooth">
        
        {/* DASHBOARD AREA */}
        <div className="bg-white p-6 lg:p-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 z-10 relative">
            
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Fitness</h2>
                    <p className="text-sm font-medium text-slate-400 flex items-center gap-1">
                        <Activity size={14} /> Monitoraggio Attività
                    </p>
                </div>
                
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={planInputRef} 
                        onChange={handlePlanFileChange} 
                        className="hidden" 
                        accept="application/pdf,image/*"
                    />
                    
                    <button 
                        onClick={() => planInputRef.current?.click()}
                        disabled={importingPlan}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
                    >
                        {importingPlan ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                        <span className="hidden sm:inline">{importingPlan ? 'Analisi in corso...' : 'Importa Scheda'}</span>
                    </button>

                    <button 
                        onClick={() => setIsEditingGoals(!isEditingGoals)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
                        title={isEditingGoals ? "Chiudi" : "Modifica Obiettivi"}
                    >
                        {isEditingGoals ? <X size={20} /> : <Settings size={20} />}
                    </button>
                </div>
            </div>

            {isEditingGoals ? (
                 <form onSubmit={handleUpdateGoals} className="max-w-xl mx-auto animate-in fade-in slide-in-from-top-2 py-4">
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Allenamenti a Settimana</label>
                            <input type="number" value={fitnessGoals.workoutsPerWeek} onChange={e => setFitnessGoals({...fitnessGoals, workoutsPerWeek: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-800 text-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Obiettivo Minuti Attivi (Daily)</label>
                            <input type="number" value={fitnessGoals.activeMinutes} onChange={e => setFitnessGoals({...fitnessGoals, activeMinutes: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Obiettivo Calorie (Daily)</label>
                            <input type="number" value={fitnessGoals.caloriesBurn} onChange={e => setFitnessGoals({...fitnessGoals, caloriesBurn: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-colors mt-8 shadow-xl shadow-slate-200">
                        <Save size={18} /> Salva Obiettivi
                    </button>
                </form>
            ) : (
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-stretch">
                    <div className="flex flex-col items-center gap-4">
                        <WorkoutRing />
                    </div>
                    <div className="flex-1 w-full">
                        <ActivityBars />
                    </div>
                </div>
            )}
        </div>

        {/* INPUT & LIST CONTAINER */}
        <div className="px-4 md:px-8 max-w-5xl mx-auto w-full space-y-8 pt-8">
            
            {/* INPUT CARD */}
            <div className={`bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-white overflow-hidden transition-all duration-500 ${isInputOpen ? 'ring-4 ring-slate-50' : ''}`}>
                {!isInputOpen ? (
                    <div className="p-2 flex items-center gap-2">
                        <button 
                            onClick={() => setIsInputOpen(true)}
                            className="flex-1 bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl flex items-center gap-4 transition-colors group text-left"
                        >
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-300 group-hover:scale-105 transition-transform">
                                <Plus size={24} />
                            </div>
                            <div>
                                <span className="font-bold text-slate-800 block text-lg">Registra Workout</span>
                                <span className="text-xs text-slate-400 font-medium">Usa AI per generare scheda da foto o testo</span>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="p-6 animate-in slide-in-from-top-4">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Zap size={20} className="text-orange-500" />
                                AI Workout Generator
                            </h3>
                            <button onClick={() => setIsInputOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                <ChevronUp size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddWorkout}>
                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <div className="flex gap-2">
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 w-32">
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Inizio</span>
                                        <input type="time" value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)} className="bg-transparent font-bold text-slate-900 w-full text-lg focus:outline-none" />
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 w-24">
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Minuti</span>
                                        <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="bg-transparent font-bold text-slate-900 w-full text-lg focus:outline-none text-center" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={workoutInput}
                                        onChange={(e) => setWorkoutInput(e.target.value)}
                                        placeholder="Es. Gambe e Spalle (o allega scheda)"
                                        className="w-full h-full bg-slate-50 rounded-2xl px-5 text-lg font-bold text-slate-900 placeholder-slate-300 focus:outline-none border-2 border-transparent focus:border-slate-900 focus:bg-white transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <FileUploader uploadedFiles={attachments} onFileUpload={setAttachments} onFileRemove={(i) => setAttachments(prev => prev.filter((_, idx) => idx !== i))} />
                            
                            <button 
                                type="submit" 
                                disabled={(!workoutInput.trim() && attachments.length === 0) || loading}
                                className="w-full mt-4 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-70 disabled:shadow-none hover:-translate-y-0.5"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                                Genera Scheda e Aggiungi
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-2 mb-4">
                    <Activity size={14} /> Allenamenti di Oggi
                </h3>

                {workouts.length === 0 ? (
                    <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Dumbbell size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold text-sm">Nessun workout registrato.</p>
                        <p className="text-xs text-slate-400 mt-1">Time to move!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                         {workouts.sort((a,b) => a.startTime.localeCompare(b.startTime)).map((workout, index) => {
                             const isExpanded = expandedWorkoutId === workout.id;
                             
                             return (
                             <div 
                                key={workout.id} 
                                onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                                className={`group bg-white rounded-3xl p-1 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer ${isExpanded ? 'ring-2 ring-slate-100' : ''}`}
                                style={{ animationDelay: `${index * 100}ms` }}
                             >
                                <div className="flex flex-col sm:flex-row gap-0 sm:gap-4">
                                    {/* Time Column */}
                                    <div className="flex sm:flex-col items-center justify-between sm:justify-center p-4 sm:w-20 bg-slate-50 rounded-2xl sm:rounded-l-2xl sm:rounded-r-none shrink-0">
                                        <span className="text-lg font-black text-slate-700 leading-none">{workout.startTime}</span>
                                        <div className="p-2 rounded-lg mt-0 sm:mt-2 bg-white border border-slate-100 text-slate-400">
                                            <Dumbbell size={14} />
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 p-4 pt-0 sm:pt-4 sm:pl-0 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-lg truncate">{workout.title}</h4>
                                                <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1 flex items-center gap-2">
                                                    {workout.workoutInfo?.muscleGroup} 
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    {workout.workoutInfo?.intensity} Intensità
                                                </p>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onRemoveWorkout(workout.id); }}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Expanded View - Exercises Table */}
                                        {isExpanded && workout.workoutInfo && (
                                            <div className="mt-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                                                {workout.workoutInfo.exercises.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {workout.workoutInfo.exercises.map((ex, i) => (
                                                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                                                <span className="text-[10px] font-bold text-slate-400 w-4">{i + 1}</span>
                                                                <span className="flex-1 font-bold text-slate-700 text-sm">{ex.name}</span>
                                                                <div className="flex gap-2">
                                                                    <span className="bg-white px-2 py-1 rounded text-[10px] font-mono font-bold text-slate-600 border border-slate-200">{ex.sets} SET</span>
                                                                    <span className="bg-white px-2 py-1 rounded text-[10px] font-mono font-bold text-slate-600 border border-slate-200">{ex.reps} REP</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-400 italic p-2">{workout.details}</p>
                                                )}

                                                <div className="flex items-center gap-4 mt-4 pt-2 border-t border-slate-50 text-xs font-bold text-slate-500 uppercase">
                                                    <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500"/> ~{workout.workoutInfo.estimatedCalories} Kcal</span>
                                                    {workout.attachments && workout.attachments.length > 0 && (
                                                        <span className="flex items-center gap-1 text-indigo-500"><Paperclip size={12} /> {workout.attachments.length} File</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {!isExpanded && (
                                            <div className="mt-3 flex justify-center">
                                                <ChevronDown size={16} className="text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                             </div>
                         )})}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
