
import React, { useState } from 'react';
import { Heart, Smile, Frown, Meh, Zap, Battery, BatteryCharging, BatteryFull, BatteryMedium, BatteryLow, Save, Feather, CalendarHeart, History } from 'lucide-react';
import { WellnessEntry, MoodType } from '../types';
import { playSound } from '../services/soundService';

interface WellnessSectionProps {
  currentDate: Date;
  entries: WellnessEntry[];
  onAddEntry: (entry: WellnessEntry) => void;
}

export const WellnessSection: React.FC<WellnessSectionProps> = ({ currentDate, entries, onAddEntry }) => {
  const dateKey = currentDate.toISOString().split('T')[0];
  const todayEntry = entries.find(e => e.date === dateKey);
  const [isEditing, setIsEditing] = useState(!todayEntry);

  const [mood, setMood] = useState<MoodType>(todayEntry?.mood || 'Neutral');
  const [energy, setEnergy] = useState(todayEntry?.energyLevel || 5);
  const [gratitude1, setGratitude1] = useState(todayEntry?.gratitude[0] || '');
  const [gratitude2, setGratitude2] = useState(todayEntry?.gratitude[1] || '');
  const [gratitude3, setGratitude3] = useState(todayEntry?.gratitude[2] || '');
  const [notes, setNotes] = useState(todayEntry?.notes || '');

  const handleSave = () => {
      onAddEntry({
          id: todayEntry?.id || crypto.randomUUID(),
          date: dateKey,
          mood,
          energyLevel: energy,
          gratitude: [gratitude1, gratitude2, gratitude3].filter(Boolean),
          notes
      });
      setIsEditing(false);
      playSound.success();
  };

  const MOODS: { type: MoodType, icon: any, label: string, color: string }[] = [
      { type: 'Amazing', icon: Heart, label: 'Fantastico', color: 'text-rose-500 bg-rose-50' },
      { type: 'Good', icon: Smile, label: 'Bene', color: 'text-emerald-500 bg-emerald-50' },
      { type: 'Neutral', icon: Meh, label: 'Normale', color: 'text-indigo-500 bg-indigo-50' },
      { type: 'Tired', icon: BatteryLow, label: 'Stanco', color: 'text-amber-500 bg-amber-50' },
      { type: 'Stressed', icon: Zap, label: 'Stressato', color: 'text-purple-500 bg-purple-50' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-y-auto pb-20 lg:pb-0 scroll-smooth">
        
        {/* HEADER */}
        <div className="bg-white p-6 lg:p-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 z-10">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Benessere</h2>
                    <p className="text-sm font-medium text-slate-400 flex items-center gap-1">
                        <CalendarHeart size={14} /> Diario & Mindfulness
                    </p>
                </div>
            </div>

            {/* MOOD SELECTOR */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col items-center gap-4">
                <span className="text-xs font-bold uppercase text-slate-400 tracking-widest">Come ti senti oggi?</span>
                <div className="flex gap-2 sm:gap-4 overflow-x-auto w-full justify-center no-scrollbar pb-2">
                    {MOODS.map(m => (
                        <button
                            key={m.type}
                            onClick={() => { setMood(m.type); if(!isEditing) setIsEditing(true); playSound.click(); }}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 w-20 shrink-0 ${
                                mood === m.type 
                                ? `${m.color} ring-4 ring-offset-2 ring-slate-100 scale-110 shadow-lg` 
                                : 'bg-white text-slate-300 hover:bg-slate-100 grayscale hover:grayscale-0'
                            }`}
                        >
                            <m.icon size={28} strokeWidth={2.5} />
                            <span className="text-[10px] font-bold">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* CONTENT */}
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
            
            {/* ENERGY SLIDER */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><BatteryCharging size={18} className="text-indigo-500"/> Livello Energia</span>
                    <span className="text-xl font-black text-indigo-600">{energy}/10</span>
                </div>
                <input 
                    type="range" 
                    min="1" max="10" 
                    value={energy} 
                    onChange={(e) => { setEnergy(Number(e.target.value)); if(!isEditing) setIsEditing(true); }}
                    className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600 transition-all"
                />
                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-300 uppercase">
                    <span>Esausto</span>
                    <span>Pieno di vita</span>
                </div>
            </div>

            {/* GRATITUDE JOURNAL */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Feather size={18} className="text-rose-500" /> 
                    Diario della Gratitudine
                </h3>
                <div className="space-y-3">
                    <input 
                        type="text" 
                        value={gratitude1}
                        onChange={(e) => { setGratitude1(e.target.value); setIsEditing(true); }}
                        placeholder="1. Sono grato per..." 
                        className="w-full bg-rose-50/50 border border-rose-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all placeholder:text-rose-300"
                    />
                    <input 
                        type="text" 
                        value={gratitude2}
                        onChange={(e) => { setGratitude2(e.target.value); setIsEditing(true); }}
                        placeholder="2. Una piccola vittoria..." 
                        className="w-full bg-rose-50/50 border border-rose-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all placeholder:text-rose-300"
                    />
                    <input 
                        type="text" 
                        value={gratitude3}
                        onChange={(e) => { setGratitude3(e.target.value); setIsEditing(true); }}
                        placeholder="3. Un momento felice..." 
                        className="w-full bg-rose-50/50 border border-rose-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all placeholder:text-rose-300"
                    />
                </div>
            </div>

            {/* NOTES */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Riflessioni del giorno</h3>
                <textarea 
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); setIsEditing(true); }}
                    placeholder="Come è andata oggi? Cosa hai imparato?" 
                    className="w-full h-32 bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
                />
            </div>

            {isEditing && (
                <button 
                    onClick={handleSave}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <Save size={18} /> Salva Diario
                </button>
            )}

            {/* RECENT HISTORY (Visual Filler) */}
            <div className="pt-8 opacity-60 pointer-events-none">
                <div className="flex items-center gap-2 mb-4 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <History size={14} /> Giorni Passati
                </div>
                <div className="flex gap-2">
                    {entries.slice(-5).reverse().map(e => (
                        <div key={e.id} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                            <div className={`w-3 h-3 rounded-full ${e.mood === 'Amazing' ? 'bg-rose-400' : e.mood === 'Good' ? 'bg-emerald-400' : 'bg-slate-400'}`}></div>
                        </div>
                    ))}
                    {entries.length === 0 && <span className="text-xs text-slate-300 italic">Nessuno storico disponibile.</span>}
                </div>
            </div>

        </div>
    </div>
  );
};
