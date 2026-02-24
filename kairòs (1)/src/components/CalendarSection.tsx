
import React, { useState, useMemo } from 'react';
import { Timeline } from './Timeline';
import { WeeklyView } from './WeeklyView';
import { ScheduleItem, Task, FixedEvent } from '../types';
import { Calendar as CalendarIcon, List, Grid3X3, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

interface CalendarSectionProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  schedule: ScheduleItem[];
  // Data needed for Week/Month views
  getEventsForWeek: (startOfWeek: Date) => Record<string, ScheduleItem[]>;
  onEventClick: (item: ScheduleItem) => void;
  daysData: Record<string, any>; // Used for month dots
  checkForActivity: (date: Date) => boolean;
  onEventMove: (id: string, newStartTime: string, newEndTime: string) => void;
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({ 
    currentDate, onDateChange, schedule, getEventsForWeek, onEventClick, checkForActivity, onEventMove
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  // --- MONTH VIEW LOGIC ---
  const MonthView = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Start Monday
      const weeks = Math.ceil((daysInMonth + firstDayIndex) / 7);
      
      const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

      return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              {/* Month Header Navigation */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize">
                      {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="flex gap-2">
                      <button onClick={() => onDateChange(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
                      <button onClick={() => onDateChange(new Date())} className="px-3 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-lg">Oggi</button>
                      <button onClick={() => onDateChange(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"><ChevronRight size={20} /></button>
                  </div>
              </div>

              {/* Grid */}
              <div className="flex-1 flex flex-col p-4">
                  <div className="grid grid-cols-7 mb-2">
                      {WEEKDAYS.map(d => (
                          <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">{d}</div>
                      ))}
                  </div>
                  <div className="grid grid-cols-7 grid-rows-5 gap-2 flex-1">
                      {Array.from({ length: weeks * 7 }).map((_, i) => {
                          const dayNum = i - firstDayIndex + 1;
                          const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
                          const dateObj = new Date(year, month, dayNum);
                          const isSelected = isCurrentMonth && dateObj.toDateString() === currentDate.toDateString();
                          const isToday = isCurrentMonth && dateObj.toDateString() === new Date().toDateString();
                          const hasActivity = isCurrentMonth ? checkForActivity(dateObj) : false;

                          if (!isCurrentMonth) return <div key={i} className="bg-slate-50/50 dark:bg-slate-800/20 rounded-xl" />;

                          return (
                              <button 
                                  key={i}
                                  onClick={() => { onDateChange(dateObj); setViewMode('day'); }}
                                  className={`relative flex flex-col items-start justify-between p-2 rounded-2xl transition-all border ${
                                      isSelected 
                                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105 z-10' 
                                      : isToday 
                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                                  }`}
                              >
                                  <span className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>{dayNum}</span>
                                  
                                  {/* Activity Dots Placeholder - Simplified */}
                                  <div className="flex gap-1 mt-auto">
                                      {hasActivity && (
                                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></div>
                                      )}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full space-y-4">
        
        {/* VIEW SWITCHER HEADER */}
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex self-center shadow-sm">
            <button 
                onClick={() => setViewMode('day')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <List size={14} /> Giorno
            </button>
            <button 
                onClick={() => setViewMode('week')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <CalendarIcon size={14} /> Settimana
            </button>
            <button 
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Grid3X3 size={14} /> Mese
            </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden relative animate-in fade-in slide-in-from-bottom-2 duration-300">
            {viewMode === 'day' && (
                <Timeline 
                    schedule={schedule} 
                    currentDate={currentDate}
                    onEventClick={onEventClick}
                    onEventMove={onEventMove} // PASSING THE NEW HANDLER
                />
            )}
            
            {viewMode === 'week' && (
                <WeeklyView 
                    currentDate={currentDate}
                    onDateChange={onDateChange}
                    getEventsForWeek={getEventsForWeek}
                    onEventClick={onEventClick}
                    onDayClick={(d) => { onDateChange(d); setViewMode('day'); }}
                />
            )}

            {viewMode === 'month' && <MonthView />}
        </div>
    </div>
  );
};
