
import React, { useState, useMemo } from 'react';
import { Target, Trash2, Trophy, Flag, Paperclip, Plus, Check, X, Calendar, ChevronRight, Sparkles, TrendingUp, Briefcase, Plane, Heart, Wallet, Book, Zap, MoreHorizontal, Layout, ArrowRight, Mountain, PlayCircle } from 'lucide-react';
import { Goal, UploadedFile, GoalStep } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FileUploader } from './FileUploader';
import { generateGoalSteps } from '../services/geminiService';

interface GoalInputProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onRemoveGoal: (id: string) => void;
  onToggleStep: (goalId: string, stepId: string) => void;
}

// --- HELPER FUNCTIONS ---

const getDaysLeft = (targetDate: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getCategoryStyle = (title: string, isDark = false) => {
    const t = title.toLowerCase();
    
    // Configurazione colori (Light / Dark bg compatible)
    if (t.match(/soldi|euro|risparmiare|investire|budget|finanza/)) 
        return { icon: Wallet, color: isDark ? 'text-emerald-400' : 'text-emerald-600', bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-50' };
    
    if (t.match(/lavoro|carriera|progetto|promozione|business|startup/)) 
        return { icon: Briefcase, color: isDark ? 'text-blue-400' : 'text-blue-600', bg: isDark ? 'bg-blue-500/20' : 'bg-blue-50' };
    
    if (t.match(/viaggio|vacanza|mondo|partire|visitare/)) 
        return { icon: Plane, color: isDark ? 'text-sky-400' : 'text-sky-600', bg: isDark ? 'bg-sky-500/20' : 'bg-sky-50' };
    
    if (t.match(/salute|corpo|dimagrire|muscoli|corsa|maratona/)) 
        return { icon: Heart, color: isDark ? 'text-rose-400' : 'text-rose-600', bg: isDark ? 'bg-rose-500/20' : 'bg-rose-50' };
    
    if (t.match(/imparare|studio|leggere|libro|laurea|corso/)) 
        return { icon: Book, color: isDark ? 'text-violet-400' : 'text-violet-600', bg: isDark ? 'bg-violet-500/20' : 'bg-violet-50' };
    
    return { icon: Mountain, color: isDark ? 'text-indigo-400' : 'text-indigo-600', bg: isDark ? 'bg-indigo-500/20' : 'bg-indigo-50' };
};

// --- COMPONENT: GOAL CARD ---

const GoalCard: React.FC<{ 
    goal: Goal; 
    onRemoveGoal: (id: string) => void; 
    onToggleStep: (goalId: string, stepId: string) => void; 
    onGenerateRoadmap: (goal: Goal) => void;
    isFeatured?: boolean;
}> = ({ goal, onRemoveGoal, onToggleStep, onGenerateRoadmap, isFeatured }) => {
      const daysLeft = getDaysLeft(goal.targetDate);
      const isOverdue = daysLeft < 0;
      const progress = goal.progress || 0;
      const isCompleted = progress === 100;
      const style = getCategoryStyle(goal.title, isFeatured); // Pass isFeatured to adjust colors for dark bg
      const Icon = style.icon;

      // Base classes
      const cardBase = isFeatured 
        ? 'bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 relative overflow-hidden group col-span-1 md:col-span-2 min-h-[300px] flex flex-col justify-between'
        : 'bg-white text-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-500 group relative flex flex-col h-full';

      return (
        <div className={cardBase}>
            {/* Background Accent for Featured */}
            {isFeatured && (
                <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            )}

            {/* Header Area */}
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4 items-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${style.bg} ${style.color}`}>
                             {isCompleted ? <Trophy size={20} /> : <Icon size={20} />}
                        </div>
                        <div>
                            {isFeatured && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Sparkles size={10} className="text-yellow-400"/> Obiettivo Principale</span>}
                            <h3 className={`font-bold tracking-tight leading-tight ${isFeatured ? 'text-3xl' : 'text-lg'}`}>
                                {goal.title}
                            </h3>
                        </div>
                    </div>
                    
                    {/* Delete Action (Hover only) */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemoveGoal(goal.id); }}
                        className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${isFeatured ? 'text-slate-500 hover:text-red-400 hover:bg-white/5' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {/* Description Text */}
                {(goal.description || isFeatured) && (
                    <p className={`text-sm font-medium leading-relaxed mb-6 ${isFeatured ? 'text-slate-400 max-w-xl' : 'text-slate-500 line-clamp-2'}`}>
                        {goal.description || "Nessuna descrizione aggiuntiva."}
                    </p>
                )}
            </div>

            {/* Middle Section: Steps */}
            <div className="flex-1 relative z-10 mb-6">
                {goal.steps && goal.steps.length > 0 ? (
                    <div className={`space-y-2 ${!isFeatured && 'max-h-32 overflow-y-auto custom-scrollbar pr-2'}`}>
                        {goal.steps.slice(0, isFeatured ? 5 : 3).map(step => (
                            <div 
                                key={step.id} 
                                onClick={() => onToggleStep(goal.id, step.id)}
                                className={`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-all group/step ${isFeatured ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                            >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                    step.completed 
                                        ? (isFeatured ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-900') 
                                        : (isFeatured ? 'border-slate-600 group-hover/step:border-white' : 'border-slate-300 group-hover/step:border-indigo-500')
                                }`}>
                                    {step.completed && <Check size={10} className="text-white" strokeWidth={3} />}
                                </div>
                                <span className={`text-xs font-bold transition-colors ${
                                    step.completed 
                                        ? (isFeatured ? 'text-slate-500 line-through' : 'text-slate-400 line-through') 
                                        : (isFeatured ? 'text-slate-300 group-hover/step:text-white' : 'text-slate-600 group-hover/step:text-indigo-600')
                                }`}>
                                    {step.title}
                                </span>
                            </div>
                        ))}
                        {goal.steps.length > (isFeatured ? 5 : 3) && (
                            <p className={`text-[10px] pl-9 ${isFeatured ? 'text-slate-500' : 'text-slate-400'}`}>+ altri {goal.steps.length - (isFeatured ? 5 : 3)} step</p>
                        )}
                    </div>
                ) : (
                    !isCompleted && (
                        <button 
                            onClick={() => onGenerateRoadmap(goal)}
                            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all w-fit ${
                                isFeatured 
                                    ? 'bg-white/10 text-white hover:bg-white/20' 
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                            }`}
                        >
                            <Sparkles size={12} /> Genera Roadmap AI
                        </button>
                    )
                )}
            </div>

            {/* Footer: Progress & Date */}
            <div className="relative z-10 pt-4 border-t border-dashed border-opacity-10 border-current">
                <div className="flex justify-between items-end mb-2">
                    <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isFeatured ? 'text-slate-400' : 'text-slate-400'}`}>
                        <Calendar size={12} />
                        {isOverdue ? <span className="text-red-500">Scaduto</span> : <span>{daysLeft} giorni rimasti</span>}
                    </div>
                    <span className={`text-xs font-bold ${isFeatured ? 'text-white' : 'text-slate-900'}`}>{Math.round(progress)}%</span>
                </div>
                
                {/* Minimalist Progress Bar */}
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isFeatured ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            isCompleted 
                                ? 'bg-emerald-500' 
                                : (isFeatured ? 'bg-white' : 'bg-slate-900')
                        }`} 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
      );
};

// --- MAIN COMPONENT ---

export const GoalInput: React.FC<GoalInputProps> = ({ goals, onAddGoal, onRemoveGoal, onToggleStep }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [steps, setSteps] = useState<GoalStep[]>([]);
  const [currentStep, setCurrentStep] = useState('');

  // --- HANDLERS ---

  const handleAttachments = (files: UploadedFile[]) => setAttachments(files);
  const handleRemoveAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

  const addStep = () => {
      if (!currentStep.trim()) return;
      setSteps(prev => [...prev, { id: uuidv4(), title: currentStep, completed: false }]);
      setCurrentStep('');
  };

  const removeStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));

  const generateAIRoadmap = async (goalTitle: string, goalDesc: string) => {
      setLoadingAI(true);
      try {
          const stepsArray = await generateGoalSteps(goalTitle, goalDesc);
          if(Array.isArray(stepsArray) && stepsArray.length > 0) {
              const newSteps = stepsArray.map(s => ({ id: uuidv4(), title: s, completed: false }));
              setSteps(prev => [...prev, ...newSteps]);
          }
      } catch (e) {
          console.error("AI Error", e);
      } finally {
          setLoadingAI(false);
      }
  };

  const handleInlineRoadmap = async (goal: Goal) => {
      setLoadingAI(true);
      try {
          const stepsArray = await generateGoalSteps(goal.title, goal.description || "");
          if(Array.isArray(stepsArray) && stepsArray.length > 0) {
              const newSteps = stepsArray.map((s: string) => ({ id: uuidv4(), title: s, completed: false }));
              const updatedGoal = { ...goal, steps: newSteps };
              onRemoveGoal(goal.id);
              onAddGoal(updatedGoal);
          }
      } catch (e) { console.error(e); } finally { setLoadingAI(false); }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    onAddGoal({
      id: uuidv4(),
      title,
      targetDate: date,
      description,
      attachments,
      steps,
      progress: 0
    });
    setTitle(''); setDate(''); setDescription(''); setAttachments([]); setSteps([]); setIsFormOpen(false);
  };

  const sortedGoals = [...goals].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  const focusGoal = sortedGoals[0];
  const otherGoals = sortedGoals.slice(1);

  return (
    <div className="space-y-8 pb-24">
      
      {/* HEADER */}
      <div className="bg-white p-6 lg:p-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 z-10 relative">
          <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Vision Board</h2>
                    <p className="text-sm font-medium text-slate-400 flex items-center gap-1 mt-1">
                        <Target size={14} /> Definisci il tuo futuro
                    </p>
                </div>
                {!isFormOpen && (
                    <button 
                        onClick={() => setIsFormOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
                    >
                        <Plus size={16} /> Nuovo
                    </button>
                )}
          </div>
      </div>

      {loadingAI && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-indigo-100 animate-in zoom-in">
                  <Sparkles size={32} className="text-indigo-500 animate-spin" />
                  <p className="font-bold text-slate-800">L'AI sta pianificando...</p>
              </div>
          </div>
      )}

      <div className="px-4 md:px-8 max-w-6xl mx-auto">
          
          {/* CREATE FORM */}
          {isFormOpen && (
            <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800">Nuovo Obiettivo</h3>
                    <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo Obiettivo..." className="w-full text-2xl font-bold text-slate-900 placeholder-slate-300 focus:outline-none bg-transparent border-b-2 border-slate-100 pb-2 focus:border-slate-900 transition-colors" autoFocus required />
                        <div className="flex gap-4">
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-slate-50 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 outline-none w-auto" required />
                            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Motivazione..." className="flex-1 bg-slate-50 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 outline-none" />
                        </div>
                    </div>

                    {/* AI & Steps */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Piano d'azione</span>
                            {title.length > 3 && (
                                <button type="button" onClick={() => generateAIRoadmap(title, description)} disabled={loadingAI} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                    <Sparkles size={12} /> Auto-Genera
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 mb-3">
                            <input type="text" value={currentStep} onChange={(e) => setCurrentStep(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())} placeholder="Aggiungi step..." className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <button type="button" onClick={addStep} className="bg-white border border-slate-200 text-slate-600 px-3 rounded-lg hover:bg-slate-100"><ArrowRight size={16} /></button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {steps.map((step, idx) => (
                                <div key={step.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 text-sm">
                                    <span className="text-slate-300 font-bold text-xs w-4">{idx + 1}.</span>
                                    <span className="flex-1 font-medium text-slate-700">{step.title}</span>
                                    <button type="button" onClick={() => removeStep(step.id)} className="text-slate-300 hover:text-red-500"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <div className="w-1/2"><FileUploader uploadedFiles={attachments} onFileUpload={handleAttachments} onFileRemove={handleRemoveAttachment} compact /></div>
                        <button type="submit" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg">Crea</button>
                    </div>
                </form>
            </div>
          )}

          {/* GOALS GRID */}
          {goals.length === 0 && !isFormOpen ? (
              <div className="text-center py-24 opacity-60">
                  <Mountain size={48} className="mx-auto text-slate-300 mb-4" strokeWidth={1} />
                  <p className="text-slate-400 font-medium">La tua Vision Board è vuota.</p>
                  <button onClick={() => setIsFormOpen(true)} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Inizia a sognare</button>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                  {focusGoal && (
                      <GoalCard 
                        goal={focusGoal} 
                        onRemoveGoal={onRemoveGoal} 
                        onToggleStep={onToggleStep} 
                        onGenerateRoadmap={handleInlineRoadmap}
                        isFeatured={true} 
                      />
                  )}
                  {otherGoals.map(goal => (
                      <GoalCard 
                        key={goal.id} 
                        goal={goal} 
                        onRemoveGoal={onRemoveGoal} 
                        onToggleStep={onToggleStep}
                        onGenerateRoadmap={handleInlineRoadmap}
                      />
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};
