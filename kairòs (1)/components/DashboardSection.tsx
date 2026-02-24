
import React from 'react';
import { 
    Calendar, CheckCircle2, Clock, Wallet, 
    ArrowRight, Sun, Moon, MapPin, TrendingUp, Loader2, CloudRain, Cloud, CloudSnow, CloudFog, Flame 
} from 'lucide-react';
import { ScheduleItem, Task, Transaction } from '../types';

interface DashboardSectionProps {
    user: any;
    date: Date;
    schedule: ScheduleItem[];
    tasks: Task[];
    transactions: Transaction[];
    routineProgress: number;
    onNavigate: (view: any) => void;
    onGenerate: () => void;
    isGenerating?: boolean;
    weather?: { temperature: number; weatherCode: number; isDay: boolean } | null;
    streak?: number;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({ 
    user, date, schedule, tasks, transactions, routineProgress, onNavigate, onGenerate, isGenerating, weather, streak = 0 
}) => {
    // --- CALCULATIONS ---
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Next Event
    const nextEvent = schedule.find(item => {
        const [h, m] = item.startTime.split(':').map(Number);
        return (h * 60 + m) > currentMinutes;
    });

    // 2. Tasks Stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const taskPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // 3. Finance (Today)
    const todayStr = date.toISOString().split('T')[0];
    const spentToday = transactions
        .filter(t => t.date === todayStr && t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    // 4. Greeting
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

    // Weather Icon Logic
    const WeatherIcon = () => {
        if (!weather) return <Sun size={20} />;
        const code = weather.weatherCode;
        if (code === 0) return weather.isDay ? <Sun size={20} className="text-orange-400" /> : <Moon size={20} className="text-indigo-300" />;
        if (code <= 3) return <Cloud size={20} className="text-slate-400" />;
        if (code >= 51 && code <= 67) return <CloudRain size={20} className="text-blue-400" />;
        if (code >= 71 && code <= 77) return <CloudSnow size={20} className="text-sky-200" />;
        return <CloudFog size={20} className="text-slate-300" />;
    };

    return (
        <div className="flex flex-col h-full bg-[#F5F5F7] dark:bg-slate-900 overflow-y-auto pb-24 lg:pb-0 scroll-smooth">
            
            {/* --- HERO HEADER --- */}
            <div className="bg-white dark:bg-slate-800 p-5 lg:p-8 rounded-b-[2rem] lg:rounded-b-[2.5rem] shadow-sm border-b border-slate-100 dark:border-slate-700 z-10 relative overflow-hidden shrink-0">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                <div className="relative z-10 mb-6 flex justify-between items-start">
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] lg:text-xs uppercase tracking-widest mb-1">
                            {date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <h1 className="text-2xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            {greeting}, <br className="lg:hidden"/> <span className="text-indigo-600 dark:text-indigo-400">{user.displayName?.split(' ')[0] || 'Utente'}</span>.
                        </h1>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* STREAK WIDGET */}
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 lg:p-3 rounded-2xl border border-orange-100 dark:border-orange-800 flex flex-col items-center min-w-[60px]">
                            <Flame size={20} className={`${streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-slate-300'}`} />
                            <span className="text-xs font-black text-orange-600 dark:text-orange-400 mt-1">{streak} gg</span>
                        </div>

                        {/* WEATHER WIDGET */}
                        {weather && (
                            <div className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-md p-2 lg:p-3 rounded-2xl border border-white/50 dark:border-slate-600 shadow-sm flex flex-col items-center min-w-[60px]">
                                <WeatherIcon />
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">{Math.round(weather.temperature)}°</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* NEXT UP CARD */}
                <div className="bg-slate-900 dark:bg-black text-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl shadow-xl shadow-slate-200 dark:shadow-none relative overflow-hidden group transition-all hover:scale-[1.01]">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl -translate-y-1/4 translate-x-1/4"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 w-full">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-sm">
                                    <Clock size={10} /> {nextEvent ? 'Next Up' : 'Status'}
                                </span>
                                {nextEvent && (
                                    <span className="text-slate-400 text-xs font-medium">inizia alle {nextEvent.startTime}</span>
                                )}
                            </div>
                            
                            <h2 className="text-xl lg:text-2xl font-bold leading-tight truncate">
                                {nextEvent ? nextEvent.title : "Tutto tranquillo per ora"}
                            </h2>
                            
                            {nextEvent?.location ? (
                                <p className="text-xs lg:text-sm text-slate-400 mt-1 flex items-center gap-1 truncate">
                                    <MapPin size={12} /> {nextEvent.location}
                                </p>
                            ) : (
                                <p className="text-xs lg:text-sm text-slate-400 mt-1">Nessun impegno imminente in agenda.</p>
                            )}
                        </div>

                        {nextEvent ? (
                            <button 
                                onClick={() => onNavigate('calendar')} 
                                className="w-full md:w-auto bg-white text-slate-900 px-4 py-3 rounded-xl text-xs lg:text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors active:scale-95 whitespace-nowrap"
                            >
                                Vedi Agenda <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button 
                                onClick={onGenerate}
                                disabled={isGenerating}
                                className="w-full md:w-auto text-indigo-300 hover:text-white transition-colors text-xs lg:text-sm font-bold flex items-center justify-start md:justify-center gap-2 disabled:opacity-50 mt-2 md:mt-0"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin"/> Elaborazione...
                                    </>
                                ) : (
                                    <>
                                        Genera programma smart <ArrowRight size={14} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- GRID CONTENT --- */}
            <div className="p-4 md:p-8 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                
                {/* 1. PROGRESS CARD */}
                <div onClick={() => onNavigate('planning')} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                            <CheckCircle2 size={24} />
                        </div>
                        <span className="text-[10px] lg:text-xs font-bold bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg">Tasks</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Math.round(taskPercentage)}%</h3>
                        <p className="text-[10px] lg:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Completati ({completedTasks}/{totalTasks})</p>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${taskPercentage}%` }}></div>
                    </div>
                </div>

                {/* 2. ROUTINE CARD */}
                <div onClick={() => onNavigate('routine')} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl">
                            <Sun size={24} />
                        </div>
                        <span className="text-[10px] lg:text-xs font-bold bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg">Routine</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Math.round(routineProgress)}%</h3>
                        <p className="text-[10px] lg:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Abitudini Svolte</p>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${routineProgress}%` }}></div>
                    </div>
                </div>

                {/* 3. BUDGET CARD */}
                <div onClick={() => onNavigate('budget')} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                            <Wallet size={24} />
                        </div>
                        <span className="text-[10px] lg:text-xs font-bold bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg">Spese Oggi</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">{spentToday.toFixed(0)}€</h3>
                        <p className="text-[10px] lg:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Uscite Registrate</p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 group-hover:underline">
                        Gestisci Finanze <TrendingUp size={12} />
                    </div>
                </div>

                {/* 4. UPCOMING LIST (Spans 2 cols on md+) */}
                <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm lg:text-base">
                            <Calendar size={18} className="text-slate-400" />
                            Prossimi Eventi
                        </h3>
                        <button onClick={() => onNavigate('calendar')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors">
                            Vedi Tutto
                        </button>
                    </div>

                    <div className="space-y-3">
                        {schedule.filter(i => {
                            const [h, m] = i.startTime.split(':').map(Number);
                            return (h * 60 + m) > currentMinutes;
                        }).slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 lg:gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors group cursor-pointer" onClick={() => onNavigate('calendar')}>
                                <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl w-12 h-12 lg:w-14 lg:h-14 shrink-0 font-bold text-slate-700 dark:text-slate-300 leading-tight border border-slate-200 dark:border-slate-600">
                                    <span className="text-xs lg:text-sm">{item.startTime}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm lg:text-base text-slate-800 dark:text-slate-100 truncate">{item.title}</h4>
                                    <p className="text-[10px] lg:text-xs text-slate-400 dark:text-slate-500 truncate">{item.location || item.description || item.category}</p>
                                </div>
                                <div className="p-2 rounded-full border border-slate-100 dark:border-slate-600 text-slate-300 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:border-indigo-100 dark:group-hover:border-indigo-900 transition-all">
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                        ))}
                        
                        {schedule.filter(i => {
                            const [h, m] = i.startTime.split(':').map(Number);
                            return (h * 60 + m) > currentMinutes;
                        }).length === 0 && (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300 dark:text-slate-600">
                                    <Moon size={20} />
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nient'altro in programma per oggi.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
