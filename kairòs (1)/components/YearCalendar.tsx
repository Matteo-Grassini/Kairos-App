
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { getItalianHoliday } from '../services/holidayService';

interface YearCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  checkForActivity?: (date: Date) => boolean;
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export const YearCalendar: React.FC<YearCalendarProps> = ({ selectedDate, onDateSelect, onClose, checkForActivity }) => {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const isSelected = (day: number, month: number) => {
    return day === selectedDate.getDate() && 
           month === selectedDate.getMonth() && 
           viewYear === selectedDate.getFullYear();
  };

  const isToday = (day: number, month: number) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           viewYear === today.getFullYear();
  };

  const handleDateClick = (day: number, month: number) => {
    const newDate = new Date(viewYear, month, day);
    onDateSelect(newDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewYear(y => y - 1)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-slate-800">{viewYear}</h2>
            <button 
              onClick={() => setViewYear(y => y + 1)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={() => {
                    const today = new Date();
                    onDateSelect(today);
                    onClose();
                }}
                className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors mr-2"
            >
                Oggi
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full text-slate-400 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {MONTHS.map((monthName, monthIndex) => {
              const daysInMonth = getDaysInMonth(viewYear, monthIndex);
              const firstDay = getFirstDayOfMonth(viewYear, monthIndex);

              return (
                <div key={monthName} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                  <h3 className="font-bold text-slate-700 mb-3 text-center">{monthName}</h3>
                  
                  {/* Weekdays */}
                  <div className="grid grid-cols-7 mb-2">
                    {WEEKDAYS.map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-slate-400">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-1 text-sm">
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateObj = new Date(viewYear, monthIndex, day);
                      const selected = isSelected(day, monthIndex);
                      const today = isToday(day, monthIndex);
                      const holidayName = getItalianHoliday(dateObj);
                      const isHoliday = !!holidayName || dateObj.getDay() === 0;
                      const hasActivity = checkForActivity ? checkForActivity(dateObj) : false;
                      
                      return (
                        <button
                          key={day}
                          onClick={() => handleDateClick(day, monthIndex)}
                          title={holidayName || undefined}
                          className={`
                            aspect-square flex items-center justify-center rounded-md font-medium text-xs transition-all relative group/day
                            ${selected 
                              ? 'bg-indigo-600 text-white shadow-md scale-110 z-10' 
                              : today 
                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold'
                                : isHoliday
                                    ? 'text-red-500 font-bold bg-red-50/50 hover:bg-red-50'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }
                          `}
                        >
                          {day}
                          
                          {/* Activity Dot */}
                          {hasActivity && !selected && (
                              <span className={`absolute bottom-1 w-1 h-1 rounded-full ${today ? 'bg-indigo-500' : isHoliday ? 'bg-red-400' : 'bg-slate-400'}`}></span>
                          )}

                          {/* Holiday Tooltip */}
                          {holidayName && (
                              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/day:opacity-100 pointer-events-none whitespace-nowrap z-20 transition-opacity">
                                  {holidayName}
                              </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
