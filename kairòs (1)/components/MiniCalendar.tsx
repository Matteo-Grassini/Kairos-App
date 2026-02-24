
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, RotateCcw } from 'lucide-react';
import { getItalianHoliday } from '../services/holidayService';

interface MiniCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  checkForActivity?: (date: Date) => boolean;
  onHeaderClick?: () => void;
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ currentDate, onDateChange, checkForActivity, onHeaderClick }) => {
  const [viewDate, setViewDate] = useState(currentDate);

  useEffect(() => {
    setViewDate(currentDate);
  }, [currentDate]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const isSelected = (d: number, m: number, y: number) => {
    return d === currentDate.getDate() && 
           m === currentDate.getMonth() && 
           y === currentDate.getFullYear();
  };

  const isToday = (d: number, m: number, y: number) => {
    const today = new Date();
    return d === today.getDate() && 
           m === today.getMonth() && 
           y === today.getFullYear();
  };

  const goToToday = (e: React.MouseEvent) => {
      e.stopPropagation();
      const today = new Date();
      onDateChange(today);
      setViewDate(today);
  };

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDayIndex = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  const monthIndex = viewDate.getMonth();
  const year = viewDate.getFullYear();

  return (
    <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-3xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 px-1">
        <button 
            onClick={onHeaderClick}
            className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm capitalize hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
            title="Apri calendario annuale"
        >
          {MONTHS[monthIndex]} {year}
          <CalendarDays size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={goToToday} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Torna a oggi">
            <RotateCcw size={12} />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <button onClick={(e) => { e.stopPropagation(); changeMonth(-1); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); changeMonth(1); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateObj = new Date(year, monthIndex, day);
          const selected = isSelected(day, monthIndex, year);
          const today = isToday(day, monthIndex, year);
          const holidayName = getItalianHoliday(dateObj);
          const isHoliday = !!holidayName || dateObj.getDay() === 0;
          const hasActivity = checkForActivity ? checkForActivity(dateObj) : false;

          return (
            <button
              key={day}
              onClick={() => onDateChange(dateObj)}
              title={holidayName || undefined}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all relative group
                ${selected 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105 z-10' 
                  : today 
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800'
                    : isHoliday
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm'
                }
              `}
            >
              <span>{day}</span>
              
              {/* Activity Dot */}
              {hasActivity && !selected && (
                  <span className={`absolute bottom-1.5 w-1 h-1 rounded-full ${today ? 'bg-indigo-500' : isHoliday ? 'bg-red-400' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
