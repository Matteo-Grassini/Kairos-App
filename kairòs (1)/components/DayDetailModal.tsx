
import React, { useState } from 'react';
import { X, Calendar, Clock, CheckSquare, Utensils, Dumbbell, ChevronRight, MapPin, Briefcase, ArrowRightCircle, Trash2, Layers, MoreHorizontal } from 'lucide-react';
import { ScheduleItem, Task, FixedEvent } from '../types';

interface DayDetailModalProps {
  date: Date;
  onClose: () => void;
  schedule: ScheduleItem[];
  tasks: Task[];
  meals: FixedEvent[];
  workouts: FixedEvent[];
  onBatchAction: (action: 'moveAllNextDay' | 'movePendingNextDay' | 'clearAll' | 'clearCompleted') => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ 
    date, onClose, schedule, tasks, meals, workouts, onBatchAction 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'schedule' | 'tasks' | 'lifestyle'>('all');
  const [showActions, setShowActions] = useState(false);

  const formattedDate = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const SectionTitle = ({ icon: Icon, title, count, color }: any) => (
      <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${color}`}>
          <Icon size={14} />
          {title}
          {count !== undefined && <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md ml-auto">{count}</span>}
      </div>
  );

  const EmptyState = ({ text }: { text: string }) => (
      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-400 font-medium italic">{text}</p>
      </div>
  );

  return (
    // UPDATED: Bottom Sheet Layout
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full sm:rounded-3xl rounded-t-[2.5rem] shadow-2xl sm:max-w-2xl overflow-hidden flex flex-col max-h-[90vh] sm:h-[85vh] h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20 flex justify-between items-start shrink-0 relative">
                
                {/* Mobile Drag Handle */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full sm:hidden"></div>

                <div className="mt-2 sm:mt-0">
                    <h2 className="text-2xl font-black text-slate-900 capitalize leading-tight">{formattedDate}</h2>
                    <p className="text-sm font-medium text-slate-400 mt-1">Riepilogo Giornaliero</p>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                    <button 
                        onClick={() => setShowActions(!showActions)}
                        className={`p-2 rounded-full transition-colors ${showActions ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-500'}`}
                        title="Azioni Smart"
                    >
                        <MoreHorizontal size={24} />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Smart Actions Toolbar */}
            {showActions && (
                <div className="bg-slate-50 border-b border-slate-100 p-4 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 shrink-0">
                    <button 
                        onClick={() => { if(confirm('Spostare tutte le attività a domani?')) onBatchAction('moveAllNextDay'); }}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all text-left group"
                    >
                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-500 group-hover:bg-indigo-100"><ArrowRightCircle size={18} /></div>
                        <div>
                            <span className="block text-xs font-bold text-slate-800">Sposta Tutto</span>
                            <span className="block text-[10px] text-slate-400">A domani</span>
                        </div>
                    </button>

                    <button 
                        onClick={() => { if(confirm('Spostare i task non completati a domani?')) onBatchAction('movePendingNextDay'); }}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-orange-300 hover:text-orange-600 transition-all text-left group"
                    >
                        <div className="bg-orange-50 p-2 rounded-lg text-orange-500 group-hover:bg-orange-100"><Layers size={18} /></div>
                        <div>
                            <span className="block text-xs font-bold text-slate-800">Sposta Pendenti</span>
                            <span className="block text-[10px] text-slate-400">Solo non fatti</span>
                        </div>
                    </button>

                    <button 
                        onClick={() => { if(confirm('Cancellare tutte le attività di oggi?')) onBatchAction('clearAll'); }}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-red-300 hover:text-red-600 transition-all text-left group"
                    >
                        <div className="bg-red-50 p-2 rounded-lg text-red-500 group-hover:bg-red-100"><Trash2 size={18} /></div>
                        <div>
                            <span className="block text-xs font-bold text-slate-800">Svuota Giorno</span>
                            <span className="block text-[10px] text-slate-400">Cancella tutto</span>
                        </div>
                    </button>

                    <button 
                        onClick={() => { if(confirm('Cancellare i task completati?')) onBatchAction('clearCompleted'); }}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-300 hover:text-emerald-600 transition-all text-left group"
                    >
                        <div className="bg-emerald-50 p-2 rounded-lg text-emerald-500 group-hover:bg-emerald-100"><CheckSquare size={18} /></div>
                        <div>
                            <span className="block text-xs font-bold text-slate-800">Pulisci Fatti</span>
                            <span className="block text-[10px] text-slate-400">Rimuovi completati</span>
                        </div>
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-50 shrink-0">
                {[{id: 'all', label: 'Tutto'}, {id: 'schedule', label: 'Agenda'}, {id: 'tasks', label: 'Tasks'}, {id: 'lifestyle', label: 'Lifestyle'}].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 space-y-8 flex-1 custom-scrollbar pb-12">
                
                {/* AGENDA SECTION */}
                {(activeTab === 'all' || activeTab === 'schedule') && (
                    <section>
                        <SectionTitle icon={Clock} title="Agenda & Appuntamenti" count={schedule.length} color="text-indigo-600" />
                        {schedule.length > 0 ? (
                            <div className="space-y-3 relative">
                                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                                {schedule.map((item, i) => (
                                    <div key={i} className="flex gap-4 relative">
                                        <div className="w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm mt-1.5 shrink-0 z-10"></div>
                                        <div className="flex-1 bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                                    {item.startTime} - {item.endTime}
                                                </span>
                                            </div>
                                            {item.location && (
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                                                    <MapPin size={10} /> {item.location}
                                                </div>
                                            )}
                                            {item.description && <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState text="Nessun appuntamento in agenda." />}
                    </section>
                )}

                {/* TASKS SECTION */}
                {(activeTab === 'all' || activeTab === 'tasks') && (
                    <section>
                        <SectionTitle icon={CheckSquare} title="Attività da fare" count={tasks.length} color="text-slate-600" />
                        {tasks.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {tasks.map((task, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${task.type === 'Inderogabile' ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}></div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-slate-700">{task.title}</h4>
                                            <div className="flex gap-2 mt-0.5">
                                                <span className="text-[10px] font-medium text-slate-400 bg-white px-1.5 rounded border border-slate-100">{task.estimatedMinutes} min</span>
                                                {task.type === 'Inderogabile' && <span className="text-[10px] font-bold text-red-500">Alta Priorità</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState text="Nessun task in lista." />}
                    </section>
                )}

                {/* LIFESTYLE SECTION */}
                {(activeTab === 'all' || activeTab === 'lifestyle') && (
                    <section className="space-y-6">
                        
                        {/* Meals */}
                        <div>
                            <SectionTitle icon={Utensils} title="Nutrizione" count={meals.length} color="text-emerald-600" />
                            {meals.length > 0 ? (
                                <div className="space-y-2">
                                    {meals.map((meal, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-emerald-50/30 rounded-xl border border-emerald-100">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Utensils size={14} /></div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800">{meal.title}</h4>
                                                    <p className="text-[10px] text-slate-500">{meal.startTime} • {meal.nutritionalInfo?.calories || '-'} kcal</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <EmptyState text="Nessun pasto registrato." />}
                        </div>

                        {/* Workouts */}
                        <div>
                            <SectionTitle icon={Dumbbell} title="Allenamento" count={workouts.length} color="text-orange-600" />
                            {workouts.length > 0 ? (
                                <div className="space-y-2">
                                    {workouts.map((wo, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-orange-50/30 rounded-xl border border-orange-100">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Dumbbell size={14} /></div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800">{wo.title}</h4>
                                                    <p className="text-[10px] text-slate-500">{wo.startTime} • {wo.workoutInfo?.muscleGroup || 'Generico'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <EmptyState text="Nessun allenamento previsto." />}
                        </div>

                    </section>
                )}

            </div>
        </div>
    </div>
  );
};
