import React, { useState } from 'react';
import { Plus, Clock, Repeat, Sparkles } from 'lucide-react';
import { EventCategory, UploadedFile } from '../types';
import { FileUploader } from './FileUploader';

interface FixedEventInputProps {
  onAddEvent: (title: string, start: string, end: string, category: EventCategory, details: string, recurrence: number[], attachments: UploadedFile[]) => void;
}

export const FixedEventInput: React.FC<FixedEventInputProps> = ({ onAddEvent }) => {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [start, setStart] = useState('13:00');
  const [end, setEnd] = useState('14:00');
  const [recurrence, setRecurrence] = useState<number[]>([]); 
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const WEEKDAYS = [
    { label: 'L', val: 1 },
    { label: 'M', val: 2 },
    { label: 'M', val: 3 },
    { label: 'G', val: 4 },
    { label: 'V', val: 5 },
    { label: 'S', val: 6 },
    { label: 'D', val: 0 },
  ];

  const toggleDay = (dayVal: number) => {
    setRecurrence(prev => 
      prev.includes(dayVal) 
        ? prev.filter(d => d !== dayVal) 
        : [...prev, dayVal]
    );
  };

  const detectCategory = (text: string): EventCategory => {
    const lower = text.toLowerCase();
    if (lower.match(/pranzo|cena|colazione|spuntino|mangiare|dieta|kcal|proteine|carbo/)) return 'meal';
    if (lower.match(/palestra|allenamento|workout|corsa|yoga|pilates|scheda|addominali|gambe|petto/)) return 'workout';
    if (lower.match(/lavoro|meeting|riunione|call|ufficio|progetto/)) return 'work';
    return 'generic';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !start || !end) return;
    
    const detectedCategory = detectCategory(title + ' ' + details);

    onAddEvent(title, start, end, detectedCategory, details, recurrence, attachments);
    
    setTitle('');
    setDetails('');
    setStart(end); 
    const [h, m] = end.split(':').map(Number);
    const nextH = (h + 1) % 24;
    setEnd(`${nextH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    setAttachments([]);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 transition-all focus-within:ring-2 focus-within:ring-indigo-100">
      
      <div className="flex flex-col gap-3">
        {/* Main Input */}
        <div>
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                Attività
                <Sparkles size={8} className="text-indigo-400" />
            </label>
            <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Es. Palestra, Pranzo, Riunione..."
            className="w-full font-bold text-slate-800 placeholder-slate-300 focus:outline-none bg-slate-50 p-2 rounded-md border border-slate-200 text-sm"
            />
        </div>

        {/* Details Input */}
        <div>
            <input
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Dettagli (es. 100g Riso, Scheda A...)"
            className="w-full text-sm font-medium text-slate-600 placeholder-slate-300 focus:outline-none bg-white p-2 border-b border-slate-200"
            />
        </div>

        {/* Recurrence Selector */}
        <div className="py-2">
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-2">
               <Repeat size={10} /> Ripeti
            </label>
            <div className="flex justify-between gap-1">
                {WEEKDAYS.map((day) => {
                    const isActive = recurrence.includes(day.val);
                    return (
                        <button
                            key={day.val}
                            type="button"
                            onClick={() => toggleDay(day.val)}
                            className={`w-8 h-8 rounded-full text-xs font-bold transition-all border ${
                                isActive 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'
                            }`}
                        >
                            {day.label}
                        </button>
                    )
                })}
            </div>
        </div>
        
        {/* Time and Submit */}
        <div className="flex items-center gap-3 text-sm text-slate-600 mt-1 pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock size={16} className="text-slate-400" />
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold cursor-pointer w-12 text-center"
            />
            <span className="text-slate-400">-</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold cursor-pointer w-12 text-center"
            />
          </div>

          <div className="border-l border-slate-200 pl-2">
            <FileUploader 
                uploadedFiles={attachments}
                onFileUpload={setAttachments}
                onFileRemove={(index) => setAttachments(prev => prev.filter((_, i) => i !== index))}
                compact
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-xs text-white shadow-sm bg-slate-900 hover:bg-black"
          >
            <Plus size={14} />
            Aggiungi
          </button>
        </div>
      </div>
    </form>
  );
};