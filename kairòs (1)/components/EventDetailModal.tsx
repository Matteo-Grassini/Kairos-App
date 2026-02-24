
import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, FileText, Download, Utensils, Dumbbell, Briefcase, BookOpen, User, Tag, Paperclip, Image as ImageIcon, Sparkles, Loader2, ListChecks, MapPin, Car, Bus, Footprints, Bike, Pencil, Save, AlignLeft, ArrowRight, Check, CheckCircle2, Play, Circle, Timer, Flame, Droplets, Trophy } from 'lucide-react';
import { ScheduleItem, EventCategory, UploadedFile, Exercise } from '../types';
import { analyzeAttachmentContent } from '../services/geminiService';
import { playSound } from '../services/soundService';

interface EventDetailModalProps {
  event: ScheduleItem | null;
  onClose: () => void;
  date: Date;
  onUpdateEvent: (id: string, newDetails: string, newDate?: Date) => void;
  onStartFocusTimer?: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose, date, onUpdateEvent, onStartFocusTimer }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [targetDateStr, setTargetDateStr] = useState('');
  
  // Interactive States
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Sync state when event opens
  useEffect(() => {
    if (event) {
        setEditValue(event.details || '');
        setTargetDateStr(date.toISOString().split('T')[0]);
        setIsEditing(false);
        setCheckedItems({});
    }
  }, [event, date]);

  if (!event) return null;

  // --- HELPER FUNCTIONS ---

  const handleAiAnalysis = async () => {
      if (!event.attachments || event.attachments.length === 0) return;
      setIsAnalyzing(true);
      playSound.click();
      try {
          const dateContext = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
          const extractedText = await analyzeAttachmentContent(event.attachments, event.title, event.category || 'generic', dateContext);
          setEditValue(extractedText);
          onUpdateEvent(event.id, extractedText);
          playSound.success();
      } catch (e) {
          alert("Impossibile analizzare i file.");
          playSound.error();
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleSaveManual = () => {
      const selectedDate = new Date(targetDateStr);
      const dateChanged = targetDateStr !== date.toISOString().split('T')[0];
      onUpdateEvent(event.id, editValue, dateChanged ? selectedDate : undefined);
      setIsEditing(false);
      playSound.success();
      if (dateChanged) onClose();
  };

  const toggleCheckItem = (index: number) => {
      setCheckedItems(prev => {
          const newState = { ...prev, [index]: !prev[index] };
          if (newState[index]) playSound.click();
          return newState;
      });
  };

  const handleCompleteActivity = () => {
      playSound.success();
      setTimeout(() => {
          onClose();
      }, 500);
  };

  const handleStartTimer = () => {
      if (onStartFocusTimer) {
          onStartFocusTimer();
          onClose(); // Close modal to show timer
      }
  };

  // --- DYNAMIC SUB-COMPONENTS ---

  const WorkoutView = () => {
      // Try to use structured data first, fallback to parsing text
      const exercises: any[] = event.workoutInfo?.exercises || [];
      const lines = editValue.split('\n').filter(l => l.trim().length > 0);
      
      const itemsToRender = exercises.length > 0 ? exercises : lines;

      return (
          <div className="space-y-4">
              <div className="flex items-center justify-between bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <div className="flex gap-3 items-center">
                      <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                          <Flame size={20} />
                      </div>
                      <div>
                          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Intensità</span>
                          <p className="font-bold text-slate-800">{event.workoutInfo?.intensity || 'Media'}</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Calorie</span>
                      <p className="font-bold text-slate-800">~{event.workoutInfo?.estimatedCalories || 300} kcal</p>
                  </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-2 mb-2 mt-2">Scheda Allenamento</h4>
                  <div className="space-y-1">
                      {itemsToRender.map((item, idx) => {
                          const isDone = checkedItems[idx];
                          const label = typeof item === 'string' ? item : item.name;
                          const subLabel = typeof item !== 'string' ? `${item.sets} x ${item.reps} ${item.weight ? `@ ${item.weight}` : ''}` : '';

                          return (
                              <div 
                                key={idx} 
                                onClick={() => toggleCheckItem(idx)}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${isDone ? 'bg-orange-100/50' : 'bg-white hover:bg-slate-100'}`}
                              >
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 bg-white'}`}>
                                      {isDone && <Check size={14} strokeWidth={3} />}
                                  </div>
                                  <div className="flex-1">
                                      <p className={`text-sm font-bold ${isDone ? 'text-orange-800 line-through opacity-60' : 'text-slate-800'}`}>{label}</p>
                                      {subLabel && <p className="text-xs text-slate-500 font-mono mt-0.5">{subLabel}</p>}
                                  </div>
                              </div>
                          )
                      })}
                      {itemsToRender.length === 0 && <p className="text-sm text-slate-400 italic p-4 text-center">Nessun esercizio rilevato. Usa l'AI per generare la scheda.</p>}
                  </div>
              </div>

              <button onClick={handleCompleteActivity} className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Trophy size={20} /> Completa Allenamento
              </button>
          </div>
      );
  };

  const MealView = () => {
      const info = event.nutritionalInfo || { calories: 0, protein: 0, carbs: 0, fats: 0 };
      
      return (
          <div className="space-y-6">
              {/* Macro Cards */}
              <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Proteine</span>
                      <span className="text-xl font-black text-emerald-800">{info.protein}g</span>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-amber-600 uppercase">Carbo</span>
                      <span className="text-xl font-black text-amber-800">{info.carbs}g</span>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">Grassi</span>
                      <span className="text-xl font-black text-indigo-800">{info.fats}g</span>
                  </div>
              </div>

              {/* Menu Text */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Utensils size={12} /> Menu Previsto
                  </h4>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {event.details || "Nessun dettaglio inserito."}
                  </p>
              </div>

              <div className="flex gap-3">
                  <button className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                      <Droplets size={18} className="text-blue-500" /> +Acqua
                  </button>
                  <button onClick={handleCompleteActivity} className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} /> Registra Pasto
                  </button>
              </div>
          </div>
      );
  };

  const StudyView = () => {
      const concepts = event.studyInfo?.keyConcepts || [];
      const method = event.studyInfo?.method || 'Pomodoro';

      return (
          <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-violet-50 rounded-2xl border border-violet-100">
                  <div>
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Metodo Suggerito</span>
                      <h4 className="text-lg font-bold text-violet-900 flex items-center gap-2">
                          <Timer size={18} /> {method}
                      </h4>
                  </div>
                  {onStartFocusTimer && (
                      <button 
                        onClick={handleStartTimer}
                        className="bg-white text-violet-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:scale-105 transition-all"
                      >
                          Avvia Timer
                      </button>
                  )}
              </div>

              {concepts.length > 0 && (
                  <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Concetti Chiave</h4>
                      <div className="flex flex-wrap gap-2">
                          {concepts.map((c, i) => (
                              <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200">
                                  # {c}
                              </span>
                          ))}
                      </div>
                  </div>
              )}

              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Note Sessione</h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {event.details || "Nessun dettaglio."}
                  </p>
              </div>
          </div>
      );
  };

  const DefaultView = () => (
      <div 
        onClick={() => setIsEditing(true)}
        className="bg-white p-5 rounded-2xl border-2 border-slate-100 text-slate-700 text-sm lg:text-base leading-relaxed shadow-sm relative overflow-hidden group cursor-pointer hover:border-indigo-100 transition-colors"
      >
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-slate-300 group-hover:bg-indigo-400 transition-colors"></div>
          <div className="whitespace-pre-wrap font-medium">
              {editValue || "Nessuna nota aggiuntiva. Clicca per aggiungere."}
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-slate-100 p-1 rounded text-slate-400">
                  <Pencil size={12} />
              </div>
          </div>
      </div>
  );

  // Determine category config
  const getCategoryConfig = (cat?: EventCategory) => {
    switch (cat) {
      case 'meal': return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Utensils, label: 'Alimentazione', actionText: 'Estrapola Menu' };
      case 'workout': return { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: Dumbbell, label: 'Allenamento', actionText: 'Genera Scheda' };
      case 'work': return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Briefcase, label: 'Lavoro', actionText: 'Riassumi Punti' };
      case 'study': return { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', icon: BookOpen, label: 'Studio', actionText: 'Argomenti Chiave' };
      case 'personal': return { color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: User, label: 'Personale', actionText: 'Analizza Documento' };
      default: return { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: Calendar, label: 'Evento', actionText: 'Analizza Dettagli' };
    }
  };

  const config = getCategoryConfig(event.category);
  const Icon = config.icon;
  const hasFiles = event.attachments && event.attachments.length > 0;

  return (
    // UPDATED: Bottom Sheet structure for mobile (items-end), centered for larger screens (sm:items-center)
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* UPDATED: Rounded top corners for sheet look, max-h adjusted */}
      <div className="bg-white w-full rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl sm:max-w-2xl overflow-hidden flex flex-col h-[85vh] sm:h-auto sm:max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-5 sm:p-6 border-b ${config.border} ${config.bg} flex justify-between items-start relative overflow-hidden shrink-0`}>
            <Icon className={`absolute -bottom-4 -right-4 w-32 h-32 opacity-10 ${config.color}`} />
            
            {/* Mobile Drag Indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full sm:hidden"></div>

            <div className="relative z-10 flex gap-4 w-full pr-8 mt-2 sm:mt-0">
                <div className={`p-3.5 rounded-2xl bg-white shadow-sm ${config.color} shrink-0 h-fit`}>
                    <Icon size={32} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 ${config.color}`}>
                            {config.label}
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight line-clamp-2 mb-2">{event.title}</h2>
                    
                    {/* Time & Location Badge */}
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs bg-white/50 px-2 py-1 rounded-lg">
                            <Clock size={12} />
                            <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.location && (
                            <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs bg-white/50 px-2 py-1 rounded-lg max-w-full truncate">
                                <MapPin size={12} />
                                <span className="truncate">{event.location}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full text-slate-500 transition-colors absolute top-4 right-4 z-20">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 bg-white flex-1 custom-scrollbar">
            
            {/* Contextual Actions Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {/* Switch to Edit Mode */}
                    {!isEditing && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl transition-colors"
                        >
                            <Pencil size={12} />
                            Modifica
                        </button>
                    )}

                    {/* AI Analysis Trigger */}
                    {hasFiles && !isAnalyzing && !isEditing && (
                        <button 
                            onClick={handleAiAnalysis}
                            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors"
                        >
                            <Sparkles size={12} />
                            {config.actionText}
                        </button>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="animate-in slide-in-from-bottom-2 duration-300 pb-8">
                {isAnalyzing ? (
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3 text-slate-500 animate-pulse">
                        <Loader2 size={24} className="animate-spin text-indigo-500" />
                        <span className="text-sm font-medium">L'AI sta analizzando i file...</span>
                    </div>
                ) : isEditing ? (
                    // EDIT MODE
                    <div className="space-y-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-2"><Calendar size={14}/> Data Evento:</span>
                            <input 
                                type="date" 
                                value={targetDateStr}
                                onChange={(e) => setTargetDateStr(e.target.value)}
                                className="bg-white border border-slate-200 rounded px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Aggiungi note, lista esercizi o menu..."
                            className="w-full h-48 bg-slate-50 p-4 rounded-xl border border-indigo-200 text-slate-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => { setIsEditing(false); setEditValue(event.details || ''); }}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Annulla
                            </button>
                            <button 
                                onClick={handleSaveManual}
                                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-lg flex items-center gap-2 transition-all"
                            >
                                <Save size={14} />
                                Salva
                            </button>
                        </div>
                    </div>
                ) : (
                    // VIEW MODE SWITCHER
                    <>
                        {event.category === 'workout' ? <WorkoutView /> :
                         event.category === 'meal' ? <MealView /> :
                         event.category === 'study' ? <StudyView /> :
                         <DefaultView />
                        }
                    </>
                )}
            </div>

            {/* Source Files List */}
            {hasFiles && !isEditing && (
                <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">
                        <Paperclip size={12} />
                        File Allegati ({event.attachments.length})
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {event.attachments.map((file, idx) => (
                            <a 
                                key={idx}
                                href={`data:${file.mimeType};base64,${file.data}`}
                                download={file.name}
                                className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all group"
                            >
                                <div className="p-2 bg-white rounded-lg text-slate-400 group-hover:text-indigo-500 shadow-sm transition-colors">
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-700">{file.name}</p>
                                    <p className="text-[10px] text-slate-400">Tocca per scaricare</p>
                                </div>
                                <Download size={14} className="text-slate-300 group-hover:text-indigo-400" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
