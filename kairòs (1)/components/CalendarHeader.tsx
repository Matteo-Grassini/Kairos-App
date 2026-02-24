import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown } from 'lucide-react';
import { YearCalendar } from './YearCalendar';

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ currentDate, onDateChange }) => {
  const [showYearView, setShowYearView] = useState(false);

  const handlePrevDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    onDateChange(newDate);
  };

  return (
    <>
      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-6">
        <button 
          onClick={handlePrevDay}
          className="p-3 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          title="Giorno Precedente"
        >
          <ChevronLeft size={20} />
        </button>

        <button 
          onClick={() => setShowYearView(true)}
          className="flex-1 flex items-center justify-center gap-3 py-2 px-4 hover:bg-slate-50 rounded-lg transition-all group"
          title="Apri Vista Calendario Annuale"
        >
          <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <CalendarDays size={20} />
          </div>
          <div className="text-center">
            <h2 className="font-bold text-slate-800 text-lg capitalize flex items-center gap-2 justify-center">
              {currentDate.toLocaleDateString('it-IT', { weekday: 'long' })}
              <ChevronDown size={16} className="text-slate-400 group-hover:text-indigo-400" />
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {currentDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </button>

        <button 
          onClick={handleNextDay}
          className="p-3 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          title="Giorno Successivo"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {showYearView && (
        <YearCalendar 
          selectedDate={currentDate} 
          onDateSelect={(date) => {
            onDateChange(date);
            setShowYearView(false);
          }}
          onClose={() => setShowYearView(false)}
        />
      )}
    </>
  );
};