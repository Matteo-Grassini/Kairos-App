
import React from 'react';
import { Trash2, Utensils, Dumbbell, Briefcase, BookOpen, ShoppingBag, Coffee, Home, Lock, Video, Paperclip, MapPin, Car, Bus, Footprints, Bike, ArrowRight, Euro, Gamepad2, Music, Stethoscope, GraduationCap, Laptop, Mail, Zap, Plane, Calendar } from 'lucide-react';
import { FixedEvent } from '../types';

interface FixedEventListProps {
  events: FixedEvent[];
  onRemoveEvent: (id: string) => void;
  onEventClick: (event: FixedEvent) => void;
}

const getEventStyle = (title: string, category: string) => {
    const t = title.toLowerCase();
    
    // --- SOPHISTICATED COLOR PALETTE (Pastel/Glassy) ---

    // Health / Medical
    if (t.match(/dottore|medico|visita|dentista|ospedale|farmacia|terapia/)) {
        return { color: 'text-rose-500', bg: 'bg-rose-50', icon: Stethoscope, border: 'border-rose-100' };
    }

    // Tech / Work
    if (t.match(/code|programmare|dev|sito|app|debug|server|lavoro|ufficio/)) {
        return { color: 'text-slate-700', bg: 'bg-slate-100', icon: Laptop, border: 'border-slate-200' };
    }

    // Calls / Meetings
    if (t.match(/call|meet|zoom|riunione/)) {
        return { color: 'text-indigo-500', bg: 'bg-indigo-50', icon: Video, border: 'border-indigo-100' };
    }

    // Leisure / Fun
    if (t.match(/giocare|game|cinema|film|serie|party|festa/)) {
        return { color: 'text-violet-500', bg: 'bg-violet-50', icon: Gamepad2, border: 'border-violet-100' };
    }

    // Travel
    if (t.match(/volo|aereo|partenza|treno|viaggio/)) {
        return { color: 'text-sky-500', bg: 'bg-sky-50', icon: Plane, border: 'border-sky-100' };
    }

    // Food
    if (category === 'meal' || t.match(/pranzo|cena|colazione|ristorante/)) {
        if (t.match(/caffè|bar|pausa/)) return { color: 'text-amber-600', bg: 'bg-amber-50', icon: Coffee, border: 'border-amber-100' };
        return { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Utensils, border: 'border-emerald-100' };
    }

    // Sport
    if (category === 'workout' || t.match(/palestra|sport|run|yoga|calcio|tennis/)) {
        return { color: 'text-orange-500', bg: 'bg-orange-50', icon: Dumbbell, border: 'border-orange-100' };
    }

    // Study
    if (category === 'study' || t.match(/studio|esame|lezione|scuola|università/)) {
        return { color: 'text-pink-500', bg: 'bg-pink-50', icon: BookOpen, border: 'border-pink-100' };
    }
    
    // Home / Personal
    if (t.match(/casa|pulire|spesa/)) {
        return { color: 'text-teal-600', bg: 'bg-teal-50', icon: Home, border: 'border-teal-100' };
    }

    // Default
    return { color: 'text-slate-500', bg: 'bg-slate-50', icon: Calendar, border: 'border-slate-100' };
};

const getTransportIcon = (mode?: string) => {
    switch(mode) {
        case 'driving': return <Car size={10} />;
        case 'transit': return <Bus size={10} />;
        case 'walking': return <Footprints size={10} />;
        case 'bicycling': return <Bike size={10} />;
        default: return <Car size={10} />;
    }
}

export const FixedEventList: React.FC<FixedEventListProps> = ({ events, onRemoveEvent, onEventClick }) => {
  if (events.length === 0) return (
      <div className="text-center py-10 opacity-50">
          <p className="text-xs font-medium text-slate-400">Nessun appuntamento fissato.</p>
      </div>
  );

  const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
        {sortedEvents.map((event, idx) => {
            const style = getEventStyle(event.title, event.category);
            const Icon = style.icon;
            
            return (
            <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`group relative flex items-stretch bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden`}
                style={{ animationDelay: `${idx * 50}ms` }}
            >
                {/* Left Colored Bar */}
                <div className={`w-1.5 ${style.bg.replace('bg-', 'bg-').replace('50', '400')}`}></div>

                <div className="flex-1 p-4 flex items-center gap-4">
                    
                    {/* Time Column (Minimalist) */}
                    <div className="flex flex-col items-center justify-center min-w-[3.5rem] text-center">
                        <span className="text-lg font-black text-slate-800 tracking-tight leading-none">{event.startTime}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 opacity-60">{event.endTime}</span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-slate-100"></div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm text-slate-800 truncate leading-tight group-hover:text-slate-900 transition-colors`}>
                            {event.title}
                        </h3>
                        
                        <div className="flex flex-wrap gap-2 items-center mt-1.5">
                            {/* Category Badge */}
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${style.bg} ${style.color}`}>
                                <Icon size={10} /> {event.category === 'generic' ? 'Evento' : event.category}
                            </span>

                            {event.location && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                                    <MapPin size={10} /> {event.location}
                                </span>
                            )}
                            
                            {event.transportMode && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                    {getTransportIcon(event.transportMode)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right Icon / Actions */}
                    <div className="relative flex items-center justify-center w-10 h-10">
                        {/* Default Icon */}
                        <div className={`absolute inset-0 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:opacity-0 group-hover:scale-50 ${style.bg} ${style.color}`}>
                            <Icon size={18} />
                        </div>

                        {/* Hover Action */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemoveEvent(event.id); }}
                            className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-50 text-red-500 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 hover:bg-red-100"
                            title="Elimina"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        )})}
    </div>
  );
};
