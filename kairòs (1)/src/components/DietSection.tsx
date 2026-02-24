
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Apple, Plus, Droplets, ChevronRight, PieChart, Beef, Wheat, Loader2, Utensils, Trash2, Clock, CheckCircle2, Sparkles, Paperclip, ChevronDown, ChevronUp, Zap, Activity, Coffee, Carrot, Sandwich, Settings, X, Save, ScanLine, FileText, UploadCloud, CreditCard, Book, ArrowRight, LayoutList, RefreshCcw, Edit2, Pencil } from 'lucide-react';
import { FixedEvent, NutritionalInfo, EventCategory, UploadedFile, Subscription, DietPlan, DietGoals } from '../types';
import { calculateNutrition, analyzeDietPlan } from '../services/geminiService';
import { FileUploader } from './FileUploader';

interface DietSectionProps {
  date: Date;
  meals: FixedEvent[];
  dietPlans?: DietPlan[]; 
  activeDietPlanId?: string | null; 
  onSaveDietPlan?: (plan: DietPlan) => void; 
  onActivateDietPlan?: (planId: string) => void; 
  onDeleteDietPlan?: (planId: string) => void; 
  onAddMeal: (title: string, start: string, end: string, category: EventCategory, details: string, recurrence: number[], attachments: UploadedFile[], targetDate?: string, nutritionalInfo?: NutritionalInfo) => void;
  onRemoveMeal: (id: string) => void;
  onClearAllMeals?: () => void;
  subscriptions?: Subscription[];
  dietGoals: DietGoals; 
  onUpdateGoals: (goals: DietGoals) => void; 
  onUpdateEvent?: (id: string, newDetails: string, newDate?: Date, newStartTime?: string, newEndTime?: string) => void;
}

export const DietSection: React.FC<DietSectionProps> = ({ 
    date, meals, 
    dietPlans = [], activeDietPlanId, onSaveDietPlan, onActivateDietPlan, onDeleteDietPlan,
    onAddMeal, onRemoveMeal, onClearAllMeals, subscriptions = [],
    dietGoals, onUpdateGoals, onUpdateEvent
}) => {
  const [loading, setLoading] = useState(false);
  const [importingPlan, setImportingPlan] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isPlansListOpen, setIsPlansListOpen] = useState(false);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  
  // INLINE EDITING STATE (BUFFERED)
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [tempGoals, setTempGoals] = useState<DietGoals>(dietGoals);

  // Sync temp goals only when opening edit mode
  useEffect(() => {
      if (!isEditingGoals) {
          setTempGoals(dietGoals);
      }
  }, [dietGoals, isEditingGoals]);

  const [mealInput, setMealInput] = useState('');
  const [mealTime, setMealTime] = useState('13:00');
  const [mealType, setMealType] = useState<'Colazione'|'Pranzo'|'Cena'|'Snack'>('Pranzo');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
  const planInputRef = useRef<HTMLInputElement>(null);

  const activeSubs = useMemo(() => subscriptions.filter(s => s.category === 'Food'), [subscriptions]);
  const activePlan = useMemo(() => dietPlans.find(p => p.id === activeDietPlanId), [dietPlans, activeDietPlanId]);

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
        setMealInput(''); setAttachments([]); setIsInputOpen(false); 
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, meal: FixedEvent) => {
      const newTime = e.target.value;
      if (!newTime) return;
      const [h, m] = newTime.split(':').map(Number);
      const endH = Math.floor((h * 60 + m + 30) / 60) % 24;
      const endM = (h * 60 + m + 30) % 60;
      const newEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      if (onUpdateEvent) onUpdateEvent(meal.id, meal.details || '', undefined, newTime, newEndTime);
  };

  const handleSaveGoals = () => {
      onUpdateGoals(tempGoals);
      setIsEditingGoals(false);
  };

  const handlePlanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files; if (!files || files.length === 0) return;
      const planName = prompt("Dai un nome a questa dieta (es. 'Massa', 'Estiva'):"); if (!planName) return;
      setImportingPlan(true);
      try {
          const file = files[0];
          const base64Data = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.readAsDataURL(file); });
          const uploadedFile: UploadedFile = { name: file.name, mimeType: file.type, data: base64Data };
          const planData = await analyzeDietPlan([uploadedFile]);
          const newPlan: DietPlan = { id: crypto.randomUUID(), name: planName, createdAt: new Date().toISOString(), data: planData, isActive: false };
          if (onSaveDietPlan) onSaveDietPlan(newPlan);
          if (confirm(`Piano "${planName}" importato! Vuoi attivarlo subito?`)) {
              if (onActivateDietPlan) onActivateDietPlan(newPlan.id);
              if (planData.goals) onUpdateGoals({ calories: planData.goals.calories || 2000, protein: planData.goals.protein || 150, carbs: planData.goals.carbs || 250, fats: planData.goals.fats || 70, water: planData.goals.water || 8 });
          } else alert(`Piano "${planName}" salvato nei tuoi piani.`);
      } catch (error) { console.error("Import error", error); alert("Errore durante l'importazione del piano."); } finally { setImportingPlan(false); if (planInputRef.current) planInputRef.current.value = ''; }
  };

  const QuickAddItem = ({ label, icon: Icon }: { label: string, icon: any }) => (
      <button type="button" onClick={(e) => handleAddMeal(e as any, label)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-300 hover:text-emerald-700 transition-all text-xs font-bold text-slate-600 active:scale-95 whitespace-nowrap group"><Icon size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" /> {label}</button>
  );

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-y-auto pb-20 lg:pb-0 scroll-smooth">
        
        {/* DASHBOARD AREA */}
        <div className="bg-white p-6 lg:p-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 z-10 relative">
            
            {/* Header with Settings */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nutrizione</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium text-slate-400 flex items-center gap-1">
                            <Activity size={14} /> Diario Giornaliero
                        </p>
                        {activePlan && (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                                <Book size={10} /> {activePlan.name}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <input type="file" ref={planInputRef} onChange={handlePlanFileChange} className="hidden" accept="application/pdf,image/*" />
                    
                    <button onClick={() => setIsPlansListOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-slate-200">
                        <LayoutList size={16} /> <span className="hidden sm:inline">I Miei Piani</span>
                    </button>

                    {onClearAllMeals && (
                        <button onClick={onClearAllMeals} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all border border-red-100 shadow-sm" title="Reset Dieta">
                            <Trash2 size={16} /> <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}

                    {isEditingGoals ? (
                        <button 
                            onClick={handleSaveGoals}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                        >
                            <Save size={16} />
                            <span className="hidden sm:inline">Salva</span>
                        </button>
                    ) : (
                        <button 
                            onClick={() => { setTempGoals(dietGoals); setIsEditingGoals(true); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        >
                            <Pencil size={16} />
                            <span className="hidden sm:inline">Modifica</span>
                        </button>
                    )}
                </div>
            </div>

            {/* GOALS VISUALIZATION / EDITING */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-stretch">
                
                {/* Calories Circle */}
                <div className="flex flex-col items-center gap-4 relative">
                    <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 160, height: 160 }}>
                        <svg className="transform -rotate-90 w-full h-full">
                            <circle cx={80} cy={80} r={74} stroke="#f1f5f9" strokeWidth={12} fill="transparent" />
                            <circle cx={80} cy={80} r={74} stroke="currentColor" strokeWidth={12} fill="transparent" strokeDasharray={2 * Math.PI * 74} strokeDashoffset={2 * Math.PI * 74 - Math.min(totals.calories / (isEditingGoals ? tempGoals.calories : dietGoals.calories), 1) * 2 * Math.PI * 74} className="text-slate-800 transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black text-slate-900">{Math.round((isEditingGoals ? tempGoals.calories : dietGoals.calories) - totals.calories)}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Kcal Rimaste</span>
                        </div>
                    </div>
                    {isEditingGoals && (
                        <div className="absolute bottom-0 bg-white shadow-lg border border-slate-200 p-2 rounded-xl flex flex-col items-center animate-in slide-in-from-bottom-2 z-20">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Obiettivo</span>
                            <input type="number" value={tempGoals.calories} onChange={(e) => setTempGoals({...tempGoals, calories: Number(e.target.value)})} className="w-16 text-center font-bold text-slate-900 outline-none border-b border-indigo-200 focus:border-indigo-500" />
                        </div>
                    )}
                </div>

                {/* Macros & Water */}
                <div className="flex-1 w-full flex flex-col justify-center h-full">
                    <div className="flex justify-between items-end mb-2 px-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Bilancio Macro</span>
                        <span className="text-xs font-bold text-slate-600">{Math.round(totals.calories)} / {isEditingGoals ? tempGoals.calories : dietGoals.calories} kcal</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/50 mb-4">
                        <div className="h-full bg-slate-800 transition-all duration-700" style={{ width: `${macroPercentages.p}%` }}></div>
                        <div className="h-full bg-slate-400 transition-all duration-700" style={{ width: `${macroPercentages.c}%` }}></div>
                        <div className="h-full bg-slate-200 transition-all duration-700" style={{ width: `${macroPercentages.f}%` }}></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {['Proteine', 'Carbo', 'Grassi'].map((label, i) => {
                            const key = label === 'Proteine' ? 'protein' : label === 'Carbo' ? 'carbs' : 'fats';
                            const val = totals[key];
                            const goal = isEditingGoals ? tempGoals[key] : dietGoals[key];
                            const color = i === 0 ? 'bg-slate-800' : i === 1 ? 'bg-slate-400' : 'bg-slate-200';
                            
                            return (
                                <div key={label} className={`flex flex-col items-center bg-slate-50 p-2 rounded-xl border ${isEditingGoals ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-100'}`}>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">{label}</span>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-sm font-black text-slate-800">{Math.round(val)}</span>
                                        {isEditingGoals ? (
                                            <input type="number" value={goal} onChange={(e) => setTempGoals({...tempGoals, [key]: Number(e.target.value)})} className="w-10 text-[9px] text-slate-500 font-medium bg-transparent text-center border-b border-slate-300 focus:border-indigo-500 outline-none" />
                                        ) : (
                                            <span className="text-[9px] text-slate-400 font-medium">/ {goal}g</span>
                                        )}
                                    </div>
                                    <div className="w-full h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                                        <div className={`h-full ${color}`} style={{ width: `${Math.min((val / goal) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/60 flex flex-col justify-center gap-3 relative">
                        <div className="flex justify-between items-center text-blue-900 px-1">
                            <span className="text-[10px] font-bold uppercase flex items-center gap-1.5 tracking-wider">
                                <Droplets size={14} className="text-blue-500 fill-blue-500" /> Idratazione
                            </span>
                            {isEditingGoals ? (
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-black">Target:</span>
                                    <input type="number" value={tempGoals.water} onChange={(e) => setTempGoals({...tempGoals, water: Number(e.target.value)})} className="w-8 text-xs font-black bg-transparent border-b border-blue-300 text-center outline-none" />
                                </div>
                            ) : (
                                <span className="text-xs font-black bg-blue-100 px-2 py-0.5 rounded-md">{waterGlasses} / {dietGoals.water}</span>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                            {Array.from({ length: isEditingGoals ? tempGoals.water : dietGoals.water }).map((_, i) => (
                                <button key={i} onClick={() => setWaterGlasses(prev => prev === i + 1 ? i : i + 1)} className={`h-8 flex-1 rounded-full transition-all duration-300 border min-w-[1.5rem] ${i < waterGlasses ? 'bg-blue-500 border-blue-600 shadow-sm scale-100' : 'bg-white border-blue-200 scale-95 hover:border-blue-400'}`}></button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {isPlansListOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><LayoutList size={20} className="text-slate-500" /> I Miei Piani Dietetici</h3>
                        <button onClick={() => setIsPlansListOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 space-y-4">
                        <button onClick={() => planInputRef.current?.click()} disabled={importingPlan} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all gap-2">
                            {importingPlan ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />} <span className="font-bold text-sm">Importa Nuovo Piano</span>
                        </button>
                        {dietPlans.length === 0 && !importingPlan && <p className="text-center text-slate-400 text-sm py-4">Nessun piano salvato.</p>}
                        {dietPlans.map(plan => (
                            <div key={plan.id} className={`bg-white p-4 rounded-2xl border transition-all flex items-center justify-between group ${plan.id === activeDietPlanId ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-slate-200 hover:border-indigo-200'}`}>
                                <div>
                                    <h4 className="font-bold text-slate-900">{plan.name}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Creato il {new Date(plan.createdAt).toLocaleDateString()}</p>
                                    <div className="flex gap-2 mt-2"><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{plan.data.goals.calories} kcal</span></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {plan.id === activeDietPlanId ? <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1"><CheckCircle2 size={12} /> Attivo</span> : <button onClick={() => { if(onActivateDietPlan) onActivateDietPlan(plan.id); setIsPlansListOpen(false); }} className="text-xs font-bold text-white bg-slate-900 px-3 py-1.5 rounded-xl hover:bg-black transition-colors">Attiva</button>}
                                    <button onClick={(e) => { e.stopPropagation(); if(onDeleteDietPlan) onDeleteDietPlan(plan.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* INPUT & LIST */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 pt-8">
            <div className={`bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-white overflow-hidden transition-all duration-500 ${isInputOpen ? 'ring-4 ring-slate-50' : ''}`}>
                {!isInputOpen ? (
                    <div className="p-2 flex items-center gap-2">
                        <button onClick={() => setIsInputOpen(true)} className="flex-1 bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl flex items-center gap-4 transition-colors group text-left">
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-300 group-hover:scale-105 transition-transform"><Plus size={24} /></div>
                            <div><span className="font-bold text-slate-800 block text-lg">Registra pasto</span><span className="text-xs text-slate-400 font-medium">Scatta foto, scrivi o usa l'AI</span></div>
                        </button>
                        <div className="hidden sm:flex gap-2 pr-2">
                            <button onClick={(e) => handleAddMeal(e as any, 'Caffè')} className="w-12 h-12 rounded-xl border border-slate-100 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 flex items-center justify-center transition-all text-slate-400" title="Caffè"><Coffee size={20}/></button>
                            <button onClick={(e) => handleAddMeal(e as any, 'Mela')} className="w-12 h-12 rounded-xl border border-slate-100 hover:bg-red-50 hover:border-red-200 hover:text-red-700 flex items-center justify-center transition-all text-slate-400" title="Frutta"><Apple size={20}/></button>
                            <button onClick={(e) => handleAddMeal(e as any, 'Snack')} className="w-12 h-12 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 flex items-center justify-center transition-all text-slate-400" title="Snack"><Sandwich size={20}/></button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ScanLine size={20} className="text-slate-900" /> AI Food Scanner</h3><button onClick={() => setIsInputOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><ChevronUp size={20} /></button></div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2"><QuickAddItem label="Caffè" icon={Coffee} /><QuickAddItem label="Frutta" icon={Apple} /><QuickAddItem label="Snack" icon={Sandwich} /><QuickAddItem label="Verdura" icon={Carrot} /></div>
                        <form onSubmit={(e) => handleAddMeal(e)} className="flex flex-col gap-5">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex gap-2">
                                    <select value={mealType} onChange={(e: any) => setMealType(e.target.value)} className="bg-slate-50 font-bold text-slate-700 text-sm px-4 py-3 rounded-2xl focus:outline-none border border-slate-100 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"><option value="Colazione">Colazione</option><option value="Pranzo">Pranzo</option><option value="Snack">Snack</option><option value="Cena">Cena</option></select>
                                    <input type="time" value={mealTime} onChange={(e) => setMealTime(e.target.value)} className="bg-slate-50 font-bold text-slate-700 text-sm px-3 py-3 rounded-2xl focus:outline-none border border-slate-100 w-auto text-center"/>
                                </div>
                                <div className="flex-1 relative"><input type="text" value={mealInput} onChange={(e) => setMealInput(e.target.value)} placeholder="Descrivi il pasto..." className="w-full h-full bg-slate-50 rounded-2xl px-5 font-bold text-slate-800 placeholder-slate-400 focus:outline-none border-2 border-transparent focus:border-slate-900 focus:bg-white transition-all" autoFocus/></div>
                            </div>
                            <FileUploader uploadedFiles={attachments} onFileUpload={setAttachments} onFileRemove={(i) => setAttachments(prev => prev.filter((_, idx) => idx !== i))} />
                            <button type="submit" disabled={(!mealInput.trim() && attachments.length === 0) || loading} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-70 disabled:shadow-none hover:-translate-y-0.5">{loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />} Calcola Valori & Aggiungi</button>
                        </form>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-2 mb-4"><Activity size={14} /> Diario Odierno</h3>
                {meals.length === 0 ? (
                    <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Utensils size={32} className="text-slate-300" /></div><p className="text-slate-500 font-bold text-sm">Nessun pasto registrato.</p></div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {meals.sort((a,b) => a.startTime.localeCompare(b.startTime)).map((meal, index) => {
                            const isExpanded = expandedMealId === meal.id;
                            const mStats = meal.nutritionalInfo || { calories: 0, protein: 0, carbs: 0, fats: 0 };
                            return (
                            <div key={meal.id} onClick={() => setExpandedMealId(isExpanded ? null : meal.id)} className={`group bg-white rounded-3xl p-1 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer ${isExpanded ? 'ring-2 ring-slate-100' : ''}`} style={{ animationDelay: `${index * 100}ms` }}>   
                                <div className="flex flex-col sm:flex-row gap-0 sm:gap-4">
                                    <div className="flex sm:flex-col items-center justify-between sm:justify-center p-4 sm:w-20 bg-slate-50 rounded-2xl sm:rounded-l-2xl sm:rounded-r-none shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative w-full" title="Modifica orario"><input type="time" className="text-lg font-black text-slate-900 bg-transparent border border-transparent rounded p-1 w-full text-center outline-none focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500 hover:bg-white/50 transition-all cursor-pointer" defaultValue={meal.startTime} onBlur={(e) => handleTimeChange(e, meal)} onClick={(e) => e.stopPropagation()} /></div>
                                        <div className="p-2 rounded-lg mt-0 sm:mt-2 bg-white border border-slate-100 text-slate-400"><Utensils size={14} /></div>
                                    </div>
                                    <div className="flex-1 p-4 pt-0 sm:pt-4 sm:pl-0 min-w-0">
                                        <div className="flex justify-between items-start"><div><h4 className="font-bold text-slate-800 text-lg truncate">{meal.title}</h4><p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1">{meal.details}</p></div><button onClick={(e) => { e.stopPropagation(); onRemoveMeal(meal.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button></div>
                                        <div className="flex items-center gap-3 mt-3"><span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{mStats.calories} kcal</span><div className="h-4 w-px bg-slate-200"></div><div className="flex gap-2 text-[10px] font-bold uppercase text-slate-500"><span>P: <span className="text-slate-800">{mStats.protein}</span></span><span>C: <span className="text-slate-800">{mStats.carbs}</span></span><span>F: <span className="text-slate-800">{mStats.fats}</span></span></div>{isExpanded ? <ChevronUp size={16} className="ml-auto text-slate-300" /> : <ChevronDown size={16} className="ml-auto text-slate-300" />}</div>
                                        {isExpanded && ( <div className="mt-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2"> <div className="grid grid-cols-3 gap-2 mb-3"> <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100"><span className="block text-[10px] font-bold text-slate-400 uppercase">Proteine</span><span className="text-lg font-black text-slate-700">{mStats.protein}g</span></div> <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100"><span className="block text-[10px] font-bold text-slate-400 uppercase">Carbo</span><span className="text-lg font-black text-slate-700">{mStats.carbs}g</span></div> <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100"><span className="block text-[10px] font-bold text-slate-400 uppercase">Grassi</span><span className="text-lg font-black text-slate-700">{mStats.fats}g</span></div> </div> {meal.attachments && meal.attachments.length > 0 && ( <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg"> <Paperclip size={12} /> {meal.attachments.length} allegati originali </div> )} </div> )}
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
