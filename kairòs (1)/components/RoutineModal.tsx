
import React, { useState, useEffect } from 'react';
import { X, User, Clock, Repeat, FileText, Sparkles, ArrowRight, CheckCircle2, Sun, Plus } from 'lucide-react';
import { EventCategory, UploadedFile, TaskType } from '../types';
import { FileUploader } from './FileUploader';

interface RoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  onAddFixed: (title: string, start: string, end: string, category: EventCategory, details: string, recurrence: number[], attachments: UploadedFile[], targetDate?: string) => void;
  onAddTask: (title: string, type: TaskType, category: EventCategory, minutes: number, isSplittable: boolean, minChunkMinutes: number, attachments: UploadedFile[], recurrence?: number[], preferredTime?: 'morning' | 'afternoon' | 'evening' | 'any', details?: string) => void;
}

export const RoutineModal: React.FC<RoutineModalProps> = ({ 
    isOpen, onClose, currentDate, onAddFixed, onAddTask 
}) => {
  // Input State
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [preferredTime, setPreferredTime] = useState<'morning' | 'afternoon' | 'evening' | 'any'>('any');
  const [recurrence, setRecurrence] = useState<number[]>([]);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
        setTitle('');
        setDetails('');
        setMinutes(30);
        setPreferredTime('any');
        setAttachments([]);
        setRecurrence([]);
    }
  }, [isOpen]);

  const handleAttachments = (files: UploadedFile[]) => {
      setAttachments(files);
  };
  
  const handleRemoveAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      let finalTitle = title.trim();
      if (!finalTitle && attachments.length > 0) {
          finalTitle = 'Analisi Documento Personale';
      }

      if (!finalTitle) return;

      // Always add as a generic flexible task for Habits (unless we add time inputs, but keeping it simple for habits)
      onAddTask(finalTitle, 'Flessibile', 'personal', minutes, false, 30, attachments, recurrence, preferredTime, details);
      onClose();
  };

  const WEEKDAYS = [
    { label: 'Lun', val: 1 }, { label: 'Mar', val: 2 }, { label: 'Mer', val: 3 },
    { label: 'Gio', val: 4 }, { label: 'Ven', val: 5 }, { label: 'Sab', val: 6 }, { label: 'Dom', val: 0 },
  ];

  const toggleDay = (dayVal: number) => {
    setRecurrence(prev => prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]);
  };

  if (!isOpen) return null;

  return (
    // UPDATED: Bottom Sheet Layout (items-end for mobile, items-center for sm+)
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
        
        {/* Main Container - Rounded Top for mobile sheet */}
        <div className="bg-white w-full sm:rounded-3xl rounded-t-[2.5rem] shadow-2xl sm:max-w-5xl h-[90vh] sm:h-[85vh] overflow-hidden flex flex-col">
            
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white sticky top-0 z-20 shrink-0 relative">
                {/* Drag Indicator for Mobile */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full sm:hidden"></div>

                <div className="w-10"></div>
                <h3 className="text-lg lg:text-xl font-bold text-slate-800 flex items-center gap-2 mt-2 sm:mt-0">
                    <User size={24} className="text-indigo-600" />
                    Nuova Abitudine
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* --- FORM SPLIT VIEW --- */}
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
                
                {/* LEFT: AI & FILE UPLOAD */}
                <div className="md:w-1/3 p-6 lg:p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-100 relative overflow-hidden bg-indigo-50 shrink-0">
                    <User className="absolute -bottom-20 -left-20 text-indigo-600 opacity-5 w-80 h-80 pointer-events-none" />
                    
                    <div className="relative z-10 space-y-4 md:space-y-6 max-w-xs w-full">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center shadow-lg bg-white mx-auto text-indigo-600">
                            <Sparkles size={32} className="lg:hidden" />
                            <Sparkles size={40} className="hidden lg:block" />
                        </div>
                        
                        <div>
                            <h4 className="text-lg lg:text-xl font-bold mb-2 text-indigo-900">Analisi Intelligente</h4>
                            <p className="text-xs lg:text-sm font-medium text-slate-600 leading-relaxed opacity-90">
                                Carica un documento o un'immagine e l'AI estrarrà le informazioni per creare la tua abitudine.
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-white/50 w-full">
                            <FileUploader 
                                uploadedFiles={attachments}
                                onFileUpload={handleAttachments}
                                onFileRemove={handleRemoveAttachment}
                            />
                            {attachments.length > 0 && (
                                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg justify-center">
                                    <CheckCircle2 size={14} />
                                    {attachments.length} file pronti
                                </div>
                            )}
                        </div>
                        
                        {!title && attachments.length === 0 && (
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-4">
                                Oppure compila a destra
                                <ArrowRight className="inline ml-1" size={10} />
                            </p>
                        )}
                    </div>
                </div>

                {/* RIGHT: MANUAL INPUT */}
                <div className="md:w-2/3 flex flex-col bg-white">
                    <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar pb-20 sm:pb-8">
                        <form id="routine-form" onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6 lg:space-y-8">
                            
                            <div>
                                <h4 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">Dettagli Abitudine</h4>
                                <p className="text-slate-400 text-xs lg:text-sm">Meditazione, Lettura, Pulizie, etc.</p>
                            </div>

                            {/* Title Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Attività</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Es. Meditazione serale"
                                    className="w-full text-xl lg:text-2xl font-bold text-slate-800 placeholder-slate-300 focus:outline-none border-b-2 border-slate-100 pb-2 focus:border-slate-800 transition-colors bg-transparent"
                                    autoFocus={attachments.length === 0}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:gap-6 animate-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-2 gap-4 lg:gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Clock size={14} /> Durata (min)
                                        </label>
                                        <input type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-700 text-center text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Sun size={14} /> Preferenza
                                        </label>
                                        <select 
                                            value={preferredTime} 
                                            onChange={(e: any) => setPreferredTime(e.target.value)}
                                            className="w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-[52px]"
                                        >
                                            <option value="any">Indifferente</option>
                                            <option value="morning">Mattina</option>
                                            <option value="afternoon">Pomeriggio</option>
                                            <option value="evening">Sera</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <FileText size={14} /> Note aggiuntive
                                    </label>
                                    <input 
                                        type="text"
                                        value={details} 
                                        onChange={e => setDetails(e.target.value)} 
                                        placeholder="Dettagli..."
                                        className="w-full bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Recurrence */}
                            <div className="space-y-3 pt-4 border-t border-slate-50">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Repeat size={14} /> Ripetizione Settimanale
                                </label>
                                <div className="flex gap-2 flex-wrap justify-between md:justify-start">
                                    {WEEKDAYS.map((day) => (
                                        <button
                                            key={day.val}
                                            type="button"
                                            onClick={() => toggleDay(day.val)}
                                            className={`w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all border-2 ${
                                                recurrence.includes(day.val)
                                                ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                                                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            {day.label.charAt(0)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-lg shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                            >
                                <Plus size={20} />
                                Aggiungi Abitudine
                            </button>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
