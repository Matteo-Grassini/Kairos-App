
import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock, CalendarDays, ArrowRight } from 'lucide-react';
import { ScheduleItem } from '../types';

interface WeeklyViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  getEventsForWeek: (startOfWeek: Date) => Record<string, ScheduleItem[]>;
  onEventClick: (event: ScheduleItem) => void;
  onDayClick: (date: Date) => void; // New prop to handle drill-down
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({ currentDate, onDateChange, getEventsForWeek, onEventClick, onDayClick }) => {
  
  // Calculate start of week (Monday)
  const startOfWeek = useMemo(() => {
      const d = new Date(currentDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      return new Date(d.setDate(diff));
  }, [currentDate]);

  const weekDays = useMemo(() => {
      return Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(startOfWeek);
          d.setDate(d.getDate() + i);
          return d;
      });
  }, [startOfWeek]);

  const eventsByDay = useMemo(() => getEventsForWeek(startOfWeek), [startOfWeek, getEventsForWeek]);

  const handlePrevWeek = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      onDateChange(newDate);
  };

  const handleNextWeek = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      onDateChange(newDate);
  };

  const getEventStyle = (category?: string) => {
      switch(category) {
          case 'work': return 'bg-blue-100/90 border-blue-200 text-blue-900 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-100';
          case 'study': return 'bg-violet-100/90 border-violet-200 text-violet-900 dark:bg-violet-900/50 dark:border-violet-700 dark:text-violet-100';
          case 'workout': return 'bg-orange-100/90 border-orange-200 text-orange-900 dark:bg-orange-900/50 dark:border-orange-700 dark:text-orange-100';
          case 'meal': return 'bg-emerald-100/90 border-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:border-emerald-700 dark:text-emerald-100';
          default: return 'bg-slate-100/90 border-slate-200 text-slate-800 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100';
      }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
            <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize flex items-center gap-2">
                <CalendarDays size={20} className="text-indigo-500" />
                {startOfWeek.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                <button onClick={handlePrevWeek} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-all shadow-sm hover:shadow"><ChevronLeft size={18}/></button>
                <button onClick={() => onDateChange(new Date())} className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all">Oggi</button>
                <button onClick={handleNextWeek} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-all shadow-sm hover:shadow"><ChevronRight size={18}/></button>
            </div>
        </div>

        {/* Calendar Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
            
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-30">
                {weekDays.map((date, i) => {
                    const isToday = new Date().toDateString() === date.toDateString();
                    return (
                        <button 
                            key={i} 
                            onClick={() => onDayClick(date)}
                            className={`p-3 text-center border-r border-slate-50 dark:border-slate-800 last:border-r-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 group ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                        >
                            <span className={`block text-[10px] font-bold uppercase mb-1 ${isToday ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                                {date.toLocaleDateString('it-IT', { weekday: 'short' })}
                            </span>
                            <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold transition-transform group-hover:scale-110 ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-slate-700 dark:text-slate-200 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                                {date.getDate()}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Grid */}
            <div className="flex min-h-[1000px] relative"> 
                {weekDays.map((date, dayIndex) => {
                    const dateKey = date.toISOString().split('T')[0];
                    const daysEvents = eventsByDay[dateKey] || [];
                    const isToday = new Date().toDateString() === date.toDateString();
                    
                    return (
                        <div 
                            key={dayIndex} 
                            className={`flex-1 border-r border-slate-50 dark:border-slate-800 last:border-r-0 relative min-w-[80px] group/col transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-800/30 ${isToday ? 'bg-indigo-50/10 dark:bg-indigo-900/5' : ''}`}
                            onClick={() => onDayClick(date)} // Click on empty space also navigates
                        >
                            {/* Time lines background */}
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} className="absolute w-full border-b border-slate-50 dark:border-slate-800/50 h-12 box-border pointer-events-none" style={{ top: `${h * 48}px` }}>
                                    {dayIndex === 0 && (
                                        <span className="absolute -left-1 -top-2.5 text-[9px] font-medium text-slate-300 dark:text-slate-600 bg-white dark:bg-slate-900 px-1 z-10">{h}:00</span>
                                    )}
                                </div>
                            ))}

                            {/* Current Time Line */}
                            {isToday && (
                                <div 
                                    className="absolute w-full border-t-2 border-red-400 z-20 pointer-events-none opacity-60"
                                    style={{ top: `${(new Date().getHours() * 60 + new Date().getMinutes()) * (48/60)}px` }}
                                >
                                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-400 rounded-full"></div>
                                </div>
                            )}

                            {/* Hover Indicator for "Open Day" */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/col:opacity-100 pointer-events-none z-0 transition-opacity">
                                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Apri</span>
                                    <ArrowRight size={10} className="text-indigo-500" />
                                </div>
                            </div>

                            {/* Events */}
                            {daysEvents.map((event) => {
                                const [sh, sm] = event.startTime.split(':').map(Number);
                                const [eh, em] = event.endTime.split(':').map(Number);
                                const startMins = sh * 60 + sm;
                                const endMins = eh * 60 + em;
                                const duration = Math.max(endMins - startMins, 25); // Min height
                                
                                const top = (startMins / 60) * 48; // 48px per hour
                                const height = (duration / 60) * 48;

                                return (
                                    <button
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                        className={`absolute left-1 right-1 rounded-lg p-1.5 text-left transition-all hover:brightness-95 hover:z-30 hover:scale-[1.02] shadow-sm hover:shadow-md overflow-hidden border z-10 ${getEventStyle(event.category)}`}
                                        style={{ top: `${top + 1}px`, height: `${height - 2}px` }}
                                    >
                                        <div className="font-bold text-[10px] leading-tight truncate">{event.title}</div>
                                        {height > 35 && (
                                            <div className="text-[9px] opacity-80 truncate flex items-center gap-1 mt-0.5">
                                                <Clock size={8} /> {event.startTime}
                                            </div>
                                        )}
                                        {height > 55 && event.location && (
                                            <div className="text-[9px] opacity-70 truncate flex items-center gap-1">
                                                <MapPin size={8} /> {event.location}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};
