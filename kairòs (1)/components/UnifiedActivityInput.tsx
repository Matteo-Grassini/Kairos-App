
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Clock, Calendar, ShieldAlert, Leaf, MapPin, ArrowRight, Euro, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { EventCategory, UploadedFile, TaskType, TransportMode } from '../types';
import { FileUploader } from './FileUploader';
import { searchPlaces } from '../services/geminiService';

interface UnifiedActivityInputProps {
  currentDate: Date;
  onAddEvent: (title: string, start: string, end: string, category: EventCategory, details: string, recurrence: number[], attachments: UploadedFile[], targetDate?: string, location?: string, transportMode?: TransportMode, nutritionalInfo?: any, workoutInfo?: any, studyInfo?: any, cost?: number) => void;
  onAddTask: (title: string, type: TaskType, category: EventCategory, minutes: number, isSplittable: boolean, minChunkMinutes: number, attachments: UploadedFile[], recurrence?: number[], preferredTime?: 'morning' | 'afternoon' | 'evening' | 'any', details?: string) => void;
}

type InputType = 'fixed' | 'flexible';

export const UnifiedActivityInput: React.FC<UnifiedActivityInputProps> = ({ currentDate, onAddEvent, onAddTask }) => {
  const [inputType, setInputType] = useState<InputType>('fixed');
  const [isExpanded, setIsExpanded] = useState(false);

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [recurrence, setRecurrence] = useState<number[]>([]); 

  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [specificDate, setSpecificDate] = useState(currentDate.toISOString().split('T')[0]);
  
  // Location States
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<{name: string, address?: string}[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | undefined>(undefined);

  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const [cost, setCost] = useState('');

  const [minutes, setMinutes] = useState<number>(60);
  const [taskType, setTaskType] = useState<TaskType>('Flessibile');

  useEffect(() => {
    setSpecificDate(currentDate.toISOString().split('T')[0]);
  }, [currentDate]);

  // Fetch Geolocation on mount
  useEffect(() => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  setUserLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                  });
              },
              (error) => {
                  console.debug("Geolocation not available or denied", error);
              }
          );
      }
  }, []);

  // Debounced Place Search
  useEffect(() => {
      if (location.length < 3) {
          setLocationSuggestions([]);
          setShowLocationDropdown(false);
          return;
      }

      // Avoid searching if user just selected an item
      if (!showLocationDropdown && location.length > 5) return;

      const delaySearch = setTimeout(async () => {
          setIsSearchingLocation(true);
          const results = await searchPlaces(location, userLocation);
          if (results.length > 0) {
              setLocationSuggestions(results);
              setShowLocationDropdown(true);
          } else {
              setShowLocationDropdown(false);
          }
          setIsSearchingLocation(false);
      }, 600); // Increased debounce slightly

      return () => clearTimeout(delaySearch);
  }, [location, userLocation]);

  const selectLocation = (place: {name: string, address?: string}) => {
      // Use the name directly as it now typically includes city/context from the improved prompt
      setLocation(place.name); 
      setShowLocationDropdown(false);
      setLocationSuggestions([]);
  };

  const WEEKDAYS = [
    { label: 'Lun', val: 1 }, { label: 'Mar', val: 2 }, { label: 'Mer', val: 3 },
    { label: 'Gio', val: 4 }, { label: 'Ven', val: 5 }, { label: 'Sab', val: 6 }, { label: 'Dom', val: 0 },
  ];

  const toggleDay = (dayVal: number) => {
    setRecurrence(prev => prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]);
  };

  const handleAttachments = (files: UploadedFile[]) => {
      setAttachments(files);
  };
  
  const handleRemoveAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const detectCategory = (text: string): EventCategory => {
      const lower = text.toLowerCase();
      if (lower.match(/pranzo|cena|colazione|snack|cibo|mangiare|dieta|spesa|supermercato/)) return 'meal';
      if (lower.match(/palestra|sport|run|yoga|allenamento|esercizi|workout|corsa/)) return 'workout';
      if (lower.match(/lavoro|call|meet|ufficio|riunione|mail|progetto|cliente|boss/)) return 'work';
      if (lower.match(/studio|leggere|corso|esame|libro|imparare|lezione|ripasso/)) return 'study';
      if (lower.match(/meditazione|hobby|relax|personale|casa|pulire|doccia/)) return 'personal';
      return 'generic';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const detectedCategory = detectCategory(title + ' ' + details);

    if (inputType === 'fixed') {
        const costValue = cost ? parseFloat(cost) : undefined;
        onAddEvent(title, start, end, detectedCategory, details, recurrence, attachments, specificDate, location, transportMode, undefined, undefined, undefined, costValue);
        const [h, m] = end.split(':').map(Number);
        const nextH = (h + 1) % 24;
        setStart(end);
        setEnd(`${nextH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        setLocation(''); 
        setCost('');
    } else {
        onAddTask(title, taskType, detectedCategory, minutes, false, 30, attachments, recurrence, 'any', details);
        setMinutes(60);
        setTaskType('Flessibile');
    }

    setTitle('');
    setDetails('');
    setAttachments([]);
    setRecurrence([]);
    setIsExpanded(false);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm p-5 lg:p-8 transition-all hover:shadow-md border border-slate-50 relative group">
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Minimalist Tab Switcher */}
        <div className="flex items-center gap-6 mb-1">
            <button
                type="button"
                onClick={() => setInputType('fixed')}
                className={`text-xs lg:text-sm font-bold transition-colors relative pb-1 ${
                    inputType === 'fixed' 
                    ? 'text-slate-900' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                Evento
                {inputType === 'fixed' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-full"></span>}
            </button>
            <button
                type="button"
                onClick={() => setInputType('flexible')}
                className={`text-xs lg:text-sm font-bold transition-colors relative pb-1 ${
                    inputType === 'flexible' 
                    ? 'text-slate-900' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                Task
                {inputType === 'flexible' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-full"></span>}
            </button>
        </div>

        {/* Hero Input */}
        <div className="relative flex items-center">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={inputType === 'fixed' ? "Nuovo appuntamento..." : "Cosa devi fare?"}
                className="w-full text-2xl lg:text-3xl font-bold text-slate-900 placeholder-slate-200 focus:outline-none bg-transparent tracking-tight py-2 pr-2"
                autoFocus
            />
        </div>

        {/* Primary Controls Row - Wraps on mobile for better touch targets */}
        <div className="flex flex-wrap items-center gap-3">
            
            {inputType === 'fixed' ? (
                <>
                    {/* Time Picker - Full width on very small screens, auto otherwise */}
                    <div className="flex items-center gap-2 lg:gap-3 bg-slate-50 px-3 lg:px-4 py-3 rounded-2xl border border-transparent focus-within:border-slate-200 transition-all cursor-pointer group/time grow md:grow-0 w-full md:w-auto">
                        <Clock size={16} className="text-slate-400 group-hover/time:text-indigo-500 transition-colors shrink-0" />
                        <div className="flex items-center gap-1 lg:gap-2 w-full justify-center">
                            <input 
                                type="time" 
                                value={start} 
                                onChange={(e) => setStart(e.target.value)} 
                                className="bg-transparent font-bold text-slate-700 focus:outline-none [&::-webkit-calendar-picker-indicator]:hidden text-base cursor-pointer text-center" 
                            />
                            <span className="text-slate-300 font-medium">→</span>
                            <input 
                                type="time" 
                                value={end} 
                                onChange={(e) => setEnd(e.target.value)} 
                                className="bg-transparent font-bold text-slate-700 focus:outline-none [&::-webkit-calendar-picker-indicator]:hidden text-base cursor-pointer text-center" 
                            />
                        </div>
                    </div>
                    
                    {/* Date Picker */}
                    <div className="flex items-center gap-2 lg:gap-3 bg-slate-50 px-3 lg:px-4 py-3 rounded-2xl border border-transparent focus-within:border-slate-200 transition-all group/date relative cursor-pointer hover:bg-slate-100 grow md:grow-0 w-full md:w-auto">
                        <Calendar size={16} className="text-slate-400 group-hover/date:text-indigo-500 transition-colors shrink-0" />
                        <span className="text-sm font-bold text-slate-700 whitespace-nowrap pointer-events-none capitalize w-full text-center">
                            {new Date(specificDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <input 
                            type="date" 
                            value={specificDate} 
                            onChange={(e) => setSpecificDate(e.target.value)} 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-2 lg:gap-3 bg-slate-50 px-3 lg:px-4 py-3 rounded-2xl border border-transparent focus-within:border-slate-200 transition-all grow md:grow-0 w-full md:w-auto">
                        <Clock size={16} className="text-slate-400" />
                        <div className="flex items-center gap-1 w-full justify-center">
                            <input 
                                type="number" 
                                min="5" 
                                step="5" 
                                value={minutes} 
                                onChange={(e) => setMinutes(Number(e.target.value))} 
                                className="bg-transparent w-12 font-bold text-slate-700 text-base focus:outline-none text-center" 
                            />
                            <span className="text-sm font-bold text-slate-400">min</span>
                        </div>
                    </div>
                    
                    <button 
                        type="button" 
                        onClick={() => setTaskType(taskType === 'Flessibile' ? 'Inderogabile' : 'Flessibile')}
                        className={`flex items-center gap-2 px-3 lg:px-4 py-3 rounded-2xl text-sm font-bold transition-all border grow md:grow-0 justify-center w-full md:w-auto ${taskType === 'Inderogabile' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-transparent hover:bg-emerald-50 hover:text-emerald-600'}`}
                    >
                        {taskType === 'Inderogabile' ? <ShieldAlert size={16} /> : <Leaf size={16} />}
                        {taskType}
                    </button>
                </>
            )}

            {/* Actions Row */}
            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button 
                    type="button" 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`flex items-center justify-center gap-1 px-3 lg:px-4 py-3 rounded-2xl text-xs font-bold transition-all grow md:grow-0 ${isExpanded ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'}`}
                >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <span className="md:hidden">Più </span>Dettagli
                </button>

                <button 
                    type="submit" 
                    disabled={!title.trim()}
                    className="h-12 bg-slate-900 text-white rounded-2xl md:rounded-full flex items-center justify-center shadow-lg shadow-slate-300 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:scale-100 grow md:grow-0 px-6 md:px-0"
                >
                    <ArrowRight size={22} />
                </button>
            </div>
        </div>

        {/* Expanded Details Section */}
        {isExpanded && (
            <div className="pt-4 border-t border-slate-50 animate-in slide-in-from-top-2 space-y-4">
                
                {/* Text Details */}
                <input 
                    type="text" 
                    value={details} 
                    onChange={(e) => setDetails(e.target.value)} 
                    placeholder="Aggiungi note, link o dettagli..." 
                    className="w-full text-sm font-medium text-slate-600 placeholder-slate-300 focus:outline-none bg-slate-50 px-4 py-3 rounded-xl transition-all focus:bg-white focus:ring-2 focus:ring-slate-100" 
                />

                {/* Location & Cost (Fixed Only) */}
                {inputType === 'fixed' && (
                    <div className="flex flex-col sm:flex-row gap-3 relative">
                        <div className="flex-1 flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-transparent focus-within:border-indigo-100 focus-within:bg-white transition-all relative">
                            {isSearchingLocation ? (
                                <Loader2 size={16} className="text-indigo-500 animate-spin" />
                            ) : (
                                <MapPin size={16} className={location ? "text-indigo-500" : "text-slate-400"} />
                            )}
                            <input 
                                type="text" 
                                value={location} 
                                onChange={(e) => { setLocation(e.target.value); setShowLocationDropdown(true); }} 
                                placeholder="Luogo..." 
                                className="bg-transparent text-sm font-bold text-slate-700 w-full focus:outline-none placeholder:font-medium" 
                            />
                            
                            {/* Autocomplete Dropdown */}
                            {showLocationDropdown && locationSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-1.5">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase px-3 py-1 flex justify-between">
                                            <span>Suggerimenti</span>
                                            {userLocation && <span className="text-indigo-500 flex items-center gap-1"><MapPin size={8}/> Vicino a te</span>}
                                        </div>
                                        {locationSuggestions.map((place, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => selectLocation(place)}
                                                className="w-full text-left flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors group"
                                            >
                                                <div className="bg-indigo-50 text-indigo-500 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                                    <MapPin size={14} />
                                                </div>
                                                <div>
                                                    <span className="block text-xs font-bold text-slate-800">{place.name}</span>
                                                    {place.address && place.address !== 'Verificato su Maps' && (
                                                        <span className="block text-[10px] text-slate-400">{place.address}</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1 bg-slate-50 px-4 py-3 rounded-xl w-full sm:w-32 border border-transparent focus-within:border-emerald-100 focus-within:bg-white transition-all">
                            <Euro size={16} className={cost ? "text-emerald-500" : "text-slate-400"} />
                            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" className="bg-transparent text-sm font-bold text-slate-700 w-full focus:outline-none placeholder:font-medium" />
                        </div>
                    </div>
                )}

                {/* Recurrence */}
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Ripetizione</span>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {WEEKDAYS.map((day) => (
                            <button key={day.val} type="button" onClick={() => toggleDay(day.val)} className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-bold transition-all border shrink-0 ${recurrence.includes(day.val) ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>
                                {day.label.charAt(0)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Files */}
                <div className="pt-2">
                    <FileUploader uploadedFiles={attachments} onFileUpload={handleAttachments} onFileRemove={handleRemoveAttachment} compact />
                </div>
            </div>
        )}

      </form>
    </div>
  );
};
