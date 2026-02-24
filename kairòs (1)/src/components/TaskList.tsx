
import React from 'react';
import { Trash2, GripVertical, ShieldAlert, Leaf, Paperclip, Repeat, Sun, Sunset, Utensils, Dumbbell, Briefcase, BookOpen, ShoppingBag, Coffee, Home, Zap, User, CheckCircle2, Laptop, Gamepad2, Music, Stethoscope, GraduationCap, Plane, Mail } from 'lucide-react';
import { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  onRemoveTask: (id: string) => void;
}

const WeekIndicator = ({ recurrence }: { recurrence?: number[] }) => {
    if (!recurrence || recurrence.length === 0) return null;
    const days = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
    const sortedRecurrence = [...recurrence].sort((a,b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));

    return (
        <div className="flex items-center gap-1 mt-2 bg-slate-50 dark:bg-slate-700/50 w-fit px-2 py-1 rounded-lg">
            <Repeat size={10} className="text-slate-400" />
            <div className="flex gap-0.5">
                {sortedRecurrence.map(d => (
                    <span key={d} className="text-[9px] font-bold text-slate-600 dark:text-slate-300">
                        {days[d]}
                    </span>
                ))}
            </div>
        </div>
    );
};

const getTimeIcon = (pref: string | undefined) => {
    switch(pref) {
        case 'morning': return <Sun size={12} className="text-orange-500" />;
        case 'afternoon': return <Sun size={12} className="text-amber-500 rotate-45" />;
        case 'evening': return <Sunset size={12} className="text-indigo-500" />;
        default: return null;
    }
}

const getTaskCategoryStyle = (task: Task) => {
    const t = task.title.toLowerCase();
    const cat = task.category;

    // --- Smart Icon Detection ---
    if (t.match(/dottore|medico|visita|farmacia/)) return { icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' };
    if (t.match(/code|dev|sito|debug/)) return { icon: Laptop, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' };
    if (t.match(/giocare|game|xbox|ps5|film/)) return { icon: Gamepad2, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' };
    if (t.match(/musica|concerto|chitarra/)) return { icon: Music, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' };
    if (t.match(/aereo|volo|valigia/)) return { icon: Plane, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20' };
    if (t.match(/mail|email|scrivere/)) return { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' };

    // --- Standard Categories ---
    if (cat === 'meal' || t.match(/pranzo|cena|cibo/)) {
        if(t.match(/caffè|colazione/)) return { icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' };
        return { icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    }
    if (cat === 'workout' || t.match(/palestra|sport|run/)) return { icon: Dumbbell, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    if (cat === 'work' || t.match(/lavoro|meet/)) return { icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    if (cat === 'study' || t.match(/studio|leggere/)) {
        if(t.match(/tesi|laurea/)) return { icon: GraduationCap, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' };
        return { icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' };
    }
    if (t.match(/spesa|comprare/)) return { icon: ShoppingBag, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' };
    if (t.match(/casa|pulire|doccia/)) return { icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' };
    
    return { icon: Zap, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-700/50' };
};

export const TaskList: React.FC<TaskListProps> = ({ tasks, onRemoveTask }) => {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/40 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
        <CheckCircle2 size={40} className="text-slate-200 dark:text-slate-600 mb-3" />
        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Tutto fatto! Nessun compito in lista.</p>
      </div>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'Inderogabile' ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-4 pb-4">
      {sortedTasks.map((task, idx) => {
        const style = getTaskCategoryStyle(task);
        const Icon = style.icon;
        
        return (
            <div
            key={task.id}
            className={`group relative flex items-stretch bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] overflow-hidden ${
                task.type === 'Inderogabile' 
                    ? 'border-red-100 dark:border-red-900/30' 
                    : 'border-slate-100 dark:border-slate-700'
            }`}
            style={{ animation: `fadeIn 0.3s ease-out ${idx * 50}ms backwards` }}
            >
            
            {/* Left Status Bar */}
            <div className={`w-1.5 ${task.type === 'Inderogabile' ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-600 group-hover:bg-indigo-400 transition-colors'}`}></div>

            <div className="flex items-center gap-4 p-4 w-full">
                
                {/* Icon Box */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                    <Icon size={20} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-sm lg:text-base text-slate-800 dark:text-slate-100 truncate leading-tight">
                            {task.title}
                        </span>
                        {task.attachments && task.attachments.length > 0 && <Paperclip size={12} className="text-indigo-400 shrink-0" />}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                         <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                            {task.estimatedMinutes}m
                        </span>

                        {task.type === 'Inderogabile' && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md border border-red-100 dark:border-red-900/30">
                                <ShieldAlert size={10} /> Alta
                            </span>
                        )}

                        {task.preferredTime && task.preferredTime !== 'any' && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-2 py-0.5 rounded-md">
                                {getTimeIcon(task.preferredTime)}
                                <span className="capitalize">{task.preferredTime === 'morning' ? 'Mattina' : task.preferredTime === 'afternoon' ? 'Pom.' : 'Sera'}</span>
                            </span>
                        )}
                    </div>
                    
                    <WeekIndicator recurrence={task.recurrence} />
                </div>

                {/* Remove Button - Always visible now */}
                <button
                    onClick={() => onRemoveTask(task.id)}
                    className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-red-900/20 rounded-xl transition-all shadow-sm"
                    title="Elimina Task"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            </div>
        );
      })}
    </div>
  );
};
