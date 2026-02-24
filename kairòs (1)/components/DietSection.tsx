
import React, { useState, useMemo, useRef } from 'react';
import { Apple, Plus, Droplets, ChevronRight, PieChart, Beef, Wheat, Loader2, Utensils, Trash2, Clock, CheckCircle2, Sparkles, Paperclip, ChevronDown, ChevronUp, Zap, Activity, Coffee, Carrot, Sandwich, Settings, X, Save, ScanLine, FileText, UploadCloud, CreditCard } from 'lucide-react';
import { FixedEvent, NutritionalInfo, EventCategory, UploadedFile, Subscription } from '../types';
import { calculateNutrition, analyzeDietPlan } from '../services/geminiService';
import { FileUploader } from './FileUploader';

interface DietSectionProps {
  date: Date;
  meals: FixedEvent[];
  onAddMeal: (title: string, start: string, end: string, category: EventCategory, details: string, recurrence: number[], attachments: UploadedFile[], targetDate?: string, nutritionalInfo?: NutritionalInfo) => void;
  onRemoveMeal: (id: string) => void;
  subscriptions?: Subscription[];
}

export const DietSection: React.FC<DietSectionProps> = ({ date, meals, onAddMeal, onRemoveMeal, subscriptions = [] }) => {
  const [loading, setLoading] = useState(false);
  const [importingPlan, setImportingPlan] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  
  // Goal Editing State
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [dailyGoals, setDailyGoals] = useState({ 
      calories: 2200, 
      protein: 160, 
      carbs: 250, 
      fats: 70, 
      water: 8 
  });
  
  const [mealInput, setMealInput] = useState('');
  const [mealTime, setMealTime] = useState('13:00');
  const [mealType, setMealType] = useState<'Colazione'|'Pranzo'|'Cena'|'Snack'>('Pranzo');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
  // Hidden input ref for full diet plan import
  const planInputRef = useRef<HTMLInputElement>(null);

  const activeSubs = useMemo(() => subscriptions.filter(s => s.category === 'Food'), [subscriptions]);

  const totals = useMemo(() => {
    return meals.reduce((acc, meal) => {
        const stats = meal.nutritionalInfo || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        return {
            calories: acc.calories + (stats.calories || 0),
            protein: acc.protein + (stats.protein || 0),
            carbs: acc.carbs + (stats.carbs || 0),
            fats: acc.fats + (stats.fats || 0)
        };
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [meals]);

  const macroPercentages = useMemo(() => {
      const totalGrams = totals.protein + totals.carbs + totals.fats;
      if (totalGrams === 0) return { p: 0, c: 0, f: 0 };
      return {
          p: (totals.protein / totalGrams) * 100,
          c: (totals.carbs / totalGrams) * 100,
          f: (totals.fats / totalGrams) * 100
      };
  }, [totals]);

  const handleAddMeal = async (e: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const inputToUse = overrideInput || mealInput;
    
    if (!inputToUse.trim() && attachments.length === 0) return;
    setLoading(true);
    try {
        const nutrition = await calculateNutrition(inputToUse, attachments);
        let displayTitle = inputToUse ? `${mealType}: ${inputToUse.split(',')[0]}` : `${mealType} (Da foto)`;
        
        const [h, m] = mealTime.split(':').map(Number);
        const endTime = `${h}:${(m+30).toString().padStart(2,'0')}`;

        onAddMeal(displayTitle, mealTime, endTime, 'meal', inputToUse || "Analisi da allegato", [], attachments, date.toISOString().split('T')[0], nutrition);
        setMealInput('');
        setAttachments([]);
        setIsInputOpen(false); 
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpdateGoals = (e: React.FormEvent) => {
      e.preventDefault();
      setIsEditingGoals(false);
  };

  // UPDATED: Logic to import full WEEKLY recurring diet plan
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

          // Call AI service
          const planData = await analyzeDietPlan([uploadedFile]);

          // Update Goals
          if (planData.goals) {
              setDailyGoals({
                  calories: planData.goals.calories || 2000,
                  protein: planData.goals.protein || 150,
                  carbs: planData.goals.carbs || 250,
                  fats: planData.goals.fats || 70,
                  water: planData.goals.water || 8
              });
          }

          // Populate Recurring Meals
          if (planData.weeklySchedule && planData.weeklySchedule.length > 0) {
              let addedCount = 0;
              planData.weeklySchedule.forEach(dayPlan => {
                  dayPlan.meals.forEach(meal => {
                      const [h, m] = meal.suggestedTime.split(':').map(Number);
                      const endTime = `${h}:${(m + 30).toString().padStart(2, '0')}`;
                      
                      const nutritionalInfo: NutritionalInfo = {
                          calories: meal.calories || 0,
                          protein: meal.protein || 0,
                          carbs: meal.carbs || 0,
                          fats: meal.fats || 0
                      };

                      // IMPORTANT: Set recurrence for this specific day
                      onAddMeal(
                          meal.title || meal.type,
                          meal.suggestedTime,
                          endTime,
                          'meal',
                          meal.details,
                          [dayPlan.dayIndex], // Recurring weekly
                          [uploadedFile], 
                          undefined, // No target date, purely recurring
                          nutritionalInfo
                      );
                      addedCount++;
                  });
              });
              alert(`Piano nutrizionale importato! ${addedCount} pasti settimanali programmati.`);
          } else {
              alert("Non sono riuscito a estrarre una dieta settimanale completa. Riprova con un'immagine più chiara.");
          }

      } catch (error) {
          console.error("Import error", error);
          alert("Errore durante l'importazione del piano.");
      } finally {
          setImportingPlan(false);
          if (planInputRef.current) planInputRef.current.value = ''; // Reset
      }
  };

  const QuickAddItem = ({ label, icon: Icon }: { label: string, icon: any }) => (
      <button 
        type="button"
        onClick={(e) => handleAddMeal(e as any, label)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-300 hover:text-emerald-700 transition-all text-xs font-bold text-slate-600 active:scale-95 whitespace-nowrap group"
      >
          <Icon size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" /> {label}
      </button>
  );

  // --- DASHBOARD COMPONENTS ---

  const CalorieRing = () => {
      // Dimensioni aumentate per migliore leggibilità
      const size = 160; 
      const center = size / 2;
      const strokeWidth = 12;
      const radius = center - strokeWidth;
      const circumference = 2 * Math.PI * radius;
      
      const percent = Math.min(totals.calories / dailyGoals.calories, 1);
      const strokeDashoffset = circumference - percent * circumference;
      const remaining = dailyGoals.calories - totals.calories;

      return (
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
              <svg className="transform -rotate-90 w-full h-full">
                  {/* Background Circle */}
                  <circle 
                    cx={center} cy={center} r={radius} 
                    stroke="#f1f5f9" 
                    strokeWidth={strokeWidth} 
                    fill="transparent" 
                  />
                  {/* Progress Circle */}
                  <circle 
                    cx={center} cy={center} r={radius} 
                    stroke="currentColor" 
                    strokeWidth={strokeWidth} 
                    fill="transparent" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                    className={`text-slate-800 transition-all duration-1000 ease-out ${remaining < 0 ? 'text-red-500' : ''}`}
                    strokeLinecap="round"
                  />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className={`text-4xl font-black tracking-tighter leading-none ${remaining < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                      {Math.round(remaining)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Kcal Rimaste</span>
              </div>
          </div>
      );
  };

  const MacroBar = () => (
      <div className="w-full flex flex-col justify-center h-full">
          <div className="flex justify-between items-end mb-2 px-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Bilancio Macro</span>
              <span className="text-xs font-bold text-slate-600">{Math.round(totals.calories)} / {dailyGoals.calories} kcal</span>
          </div>
          
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/50 mb-4">
              <div className="h-full bg-slate-800 transition-all duration-700" style={{ width: `${macroPercentages.p}%` }}></div>
              <div className="h-full bg-slate-400 transition-all duration-700" style={{ width: `${macroPercentages.c}%` }}></div>
              <div className="h-full bg-slate-200 transition-all duration-700" style={{ width: `${macroPercentages.f}%` }}></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Proteine</span>
                  <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black text-slate-800">{Math.round(totals.protein)}</span>
                      <span className="text-[9px] text-slate-400 font-medium">/ {dailyGoals.protein}g</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-slate-800" style={{ width: `${Math.min((totals.protein / dailyGoals.protein) * 100, 100)}%` }}></div>
                  </div>
              </div>

              <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Carbo</span>
                  <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black text-slate-800">{Math.round(totals.carbs)}</span>
                      <span className="text-[9px] text-slate-400 font-medium">/ {dailyGoals.carbs}g</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-slate-400" style={{ width: `${Math.min((totals.carbs / dailyGoals.carbs) * 100, 100)}%` }}></div>
                  </div>
              </div>

              <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Grassi</span>
                  <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black text-slate-800">{Math.round(totals.fats)}</span>
                      <span className="text-[9px] text-slate-400 font-medium">/ {dailyGoals.fats}g</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-slate-300" style={{ width: `${Math.min((totals.fats / dailyGoals.fats) * 100, 100)}%` }}></div>
                  </div>
              </div>
          </div>

          {activeSubs.length > 0 && (
              <div className="mt-4 bg-emerald-50 border border-emerald-100 p-2 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 px-1">
                      <CreditCard size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Piani Attivi</span>
                  </div>
                  <div className="flex gap-1">
                      {activeSubs.map(s => (
                          <span key={s.id} className="text-[9px] font-bold bg-white text-emerald-600 px-2 py-1 rounded-lg border border-emerald-200">{s.name}</span>
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
            
            {/* Header with Settings */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nutrizione</h2>
                    <p className="text-sm font-medium text-slate-400 flex items-center gap-1">
                        <Activity size={14} /> Diario Giornaliero
                    </p>
                </div>
                
                <div className="flex gap-2">
                    {/* Hidden Input for Plan Import */}
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
                        <span className="hidden sm:inline">{importingPlan ? 'Analisi in corso...' : 'Importa Piano Dieta'}</span>
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
                // EDIT GOALS FORM
                <form onSubmit={handleUpdateGoals} className="max-w-xl mx-auto animate-in fade-in slide-in-from-top-2 py-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                        <div className="col-span-2">
                             <label className="text-xs font-bold uppercase text-slate-400 mb-1.5 block ml-1">Calorie (kcal)</label>
                             <input type="number" value={dailyGoals.calories} onChange={e => setDailyGoals({...dailyGoals, calories: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-800 text-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Proteine (g)</label>
                            <input type="number" value={dailyGoals.protein} onChange={e => setDailyGoals({...dailyGoals, protein: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Carboidrati (g)</label>
                            <input type="number" value={dailyGoals.carbs} onChange={e => setDailyGoals({...dailyGoals, carbs: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Grassi (g)</label>
                            <input type="number" value={dailyGoals.fats} onChange={e => setDailyGoals({...dailyGoals, fats: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Acqua (bicchieri)</label>
                            <input type="number" value={dailyGoals.water} onChange={e => setDailyGoals({...dailyGoals, water: Number(e.target.value)})} className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-3 font-bold text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-colors mt-8 shadow-xl shadow-slate-200">
                        <Save size={18} /> Salva Obiettivi
                    </button>
                </form>
            ) : (
                // DASHBOARD VIEW
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-stretch">
                    
                    {/* Calories Circle */}
                    <div className="flex flex-col items-center gap-4">
                        <CalorieRing />
                    </div>

                    {/* Macros & Water */}
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                        
                        {/* Macro Bars */}
                        <MacroBar />

                        {/* Water Tracker */}
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/60 flex flex-col justify-center gap-3">
                            <div className="flex justify-between items-center text-blue-900 px-1">
                                <span className="text-[10px] font-bold uppercase flex items-center gap-1.5 tracking-wider">
                                    <Droplets size={14} className="text-blue-500 fill-blue-500" /> Idratazione
                                </span>
                                <span className="text-xs font-black bg-blue-100 px-2 py-0.5 rounded-md">{waterGlasses} / {dailyGoals.water}</span>
                            </div>
                            <div className="flex flex-wrap justify-between gap-2">
                                {Array.from({ length: dailyGoals.water }).map((_, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setWaterGlasses(prev => prev === i + 1 ? i : i + 1)}
                                        className={`h-8 flex-1 rounded-full transition-all duration-300 border min-w-[1.5rem] ${
                                            i < waterGlasses 
                                            ? 'bg-blue-500 border-blue-600 shadow-sm scale-100' 
                                            : 'bg-white border-blue-200 scale-95 hover:border-blue-400'
                                        }`}
                                    ></button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
            
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
                                <span className="font-bold text-slate-800 block text-lg">Registra pasto</span>
                                <span className="text-xs text-slate-400 font-medium">Scatta foto, scrivi o usa l'AI</span>
                            </div>
                        </button>
                        
                        {/* Quick Actions (Collapsed View) */}
                        <div className="hidden sm:flex gap-2 pr-2">
                            <button onClick={(e) => handleAddMeal(e as any, 'Caffè')} className="w-12 h-12 rounded-xl border border-slate-100 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 flex items-center justify-center transition-all text-slate-400" title="Caffè"><Coffee size={20}/></button>
                            <button onClick={(e) => handleAddMeal(e as any, 'Mela')} className="w-12 h-12 rounded-xl border border-slate-100 hover:bg-red-50 hover:border-red-200 hover:text-red-700 flex items-center justify-center transition-all text-slate-400" title="Frutta"><Apple size={20}/></button>
                            <button onClick={(e) => handleAddMeal(e as any, 'Snack')} className="w-12 h-12 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 flex items-center justify-center transition-all text-slate-400" title="Snack"><Sandwich size={20}/></button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <ScanLine size={20} className="text-slate-900" />
                                AI Food Scanner
                            </h3>
                            <button onClick={() => setIsInputOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                <ChevronUp size={20} />
                            </button>
                        </div>

                        {/* Quick Suggestions */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
                            <QuickAddItem label="Caffè" icon={Coffee} />
                            <QuickAddItem label="Frutta" icon={Apple} />
                            <QuickAddItem label="Snack" icon={Sandwich} />
                            <QuickAddItem label="Verdura" icon={Carrot} />
                        </div>

                        <form onSubmit={(e) => handleAddMeal(e)} className="flex flex-col gap-5">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex gap-2">
                                    <select 
                                        value={mealType} 
                                        onChange={(e: any) => setMealType(e.target.value)}
                                        className="bg-slate-50 font-bold text-slate-700 text-sm px-4 py-3 rounded-2xl focus:outline-none border border-slate-100 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                                    >
                                        <option value="Colazione">Colazione</option>
                                        <option value="Pranzo">Pranzo</option>
                                        <option value="Snack">Snack</option>
                                        <option value="Cena">Cena</option>
                                    </select>
                                    <input 
                                        type="time" 
                                        value={mealTime} 
                                        onChange={(e) => setMealTime(e.target.value)} 
                                        className="bg-slate-50 font-bold text-slate-700 text-sm px-3 py-3 rounded-2xl focus:outline-none border border-slate-100 w-auto text-center"
                                    />
                                </div>
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        value={mealInput}
                                        onChange={(e) => setMealInput(e.target.value)}
                                        placeholder="Descrivi il pasto..."
                                        className="w-full h-full bg-slate-50 rounded-2xl px-5 font-bold text-slate-800 placeholder-slate-400 focus:outline-none border-2 border-transparent focus:border-slate-900 focus:bg-white transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <FileUploader 
                                uploadedFiles={attachments}
                                onFileUpload={setAttachments}
                                onFileRemove={(i) => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                            />

                            <button 
                                type="submit" 
                                disabled={(!mealInput.trim() && attachments.length === 0) || loading}
                                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-70 disabled:shadow-none hover:-translate-y-0.5"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                                Calcola Valori & Aggiungi
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* MEAL LIST */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-2 mb-4">
                    <Activity size={14} /> Diario Odierno
                </h3>
                
                {meals.length === 0 ? (
                    <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Utensils size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold text-sm">Nessun pasto registrato.</p>
                        <p className="text-xs text-slate-400 mt-1">L'energia parte dalla tavola!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {meals.sort((a,b) => a.startTime.localeCompare(b.startTime)).map((meal, index) => {
                            const isExpanded = expandedMealId === meal.id;
                            const mStats = meal.nutritionalInfo || { calories: 0, protein: 0, carbs: 0, fats: 0 };
                            
                            return (
                            <div 
                                key={meal.id}
                                onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                                className={`group bg-white rounded-3xl p-1 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer ${isExpanded ? 'ring-2 ring-slate-100' : ''}`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >   
                                <div className="flex flex-col sm:flex-row gap-0 sm:gap-4">
                                    {/* Time Column */}
                                    <div className="flex sm:flex-col items-center justify-between sm:justify-center p-4 sm:w-20 bg-slate-50 rounded-2xl sm:rounded-l-2xl sm:rounded-r-none shrink-0">
                                        <span className="text-lg font-black text-slate-700 leading-none">{meal.startTime}</span>
                                        <div className="p-2 rounded-lg mt-0 sm:mt-2 bg-white border border-slate-100 text-slate-400">
                                            <Utensils size={14} />
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 p-4 pt-0 sm:pt-4 sm:pl-0 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-lg truncate">{meal.title}</h4>
                                                <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1">{meal.details}</p>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onRemoveMeal(meal.id); }}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{mStats.calories} kcal</span>
                                            <div className="h-4 w-px bg-slate-200"></div>
                                            <div className="flex gap-2 text-[10px] font-bold uppercase text-slate-500">
                                                <span>P: <span className="text-slate-800">{mStats.protein}</span></span>
                                                <span>C: <span className="text-slate-800">{mStats.carbs}</span></span>
                                                <span>F: <span className="text-slate-800">{mStats.fats}</span></span>
                                            </div>
                                            {isExpanded ? <ChevronUp size={16} className="ml-auto text-slate-300" /> : <ChevronDown size={16} className="ml-auto text-slate-300" />}
                                        </div>

                                        {/* Expanded View */}
                                        {isExpanded && (
                                            <div className="mt-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Proteine</span>
                                                        <span className="text-lg font-black text-slate-700">{mStats.protein}g</span>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Carbo</span>
                                                        <span className="text-lg font-black text-slate-700">{mStats.carbs}g</span>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Grassi</span>
                                                        <span className="text-lg font-black text-slate-700">{mStats.fats}g</span>
                                                    </div>
                                                </div>
                                                {meal.attachments && meal.attachments.length > 0 && (
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg">
                                                        <Paperclip size={12} /> {meal.attachments.length} allegati originali
                                                    </div>
                                                )}
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
