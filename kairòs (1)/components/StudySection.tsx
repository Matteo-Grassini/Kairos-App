
import React, { useState, useMemo, useRef } from 'react';
import { BookOpen, Plus, Clock, Brain, Library, Timer, Loader2, Trash2, CheckCircle2, ListChecks, PenTool, Paperclip, Hash, Zap, Activity, Settings, X, Save, UploadCloud, ChevronDown, ChevronUp, CreditCard, GraduationCap } from 'lucide-react';
import { FixedEvent, StudyInfo, EventCategory, UploadedFile, Subscription } from '../types';
import { calculateStudySession, analyzeStudyPlan } from '../services/geminiService';
import { FileUploader } from './FileUploader';

interface StudySectionProps {
  date: Date;
  studySessions: FixedEvent[];
  onAddStudySession: (title: string, start: string, end: string, category: EventCategory, details: string, recurrence: number[], attachments: UploadedFile[], targetDate?: string, studyInfo?: StudyInfo) => void;
  onRemoveStudySession: (id: string) => void;
  subscriptions?: Subscription[];
}

export const StudySection: React.FC<StudySectionProps> = ({ date, studySessions, onAddStudySession, onRemoveStudySession, subscriptions = [] }) => {
  const [loading, setLoading] = useState(false);
  const [importingPlan, setImportingPlan] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Goal Editing State
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [studyGoals, setStudyGoals] = useState({
      dailyHours: 4,
      weeklySessions: 5
  });
  
  const [studyInput, setStudyInput] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(120);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
  // Hidden input ref
  const planInputRef = useRef<HTMLInputElement>(null);

  const activeSubs = useMemo(() => subscriptions.filter(s => s.category === 'Services' || s.category === 'Investments'), [subscriptions]);

  const stats = useMemo(() => {
    return studySessions.reduce((acc, s) => {
        const info = s.studyInfo || { subject: 'Generico', keyConcepts: [], method: 'Pomodoro' };
        
        const [shStr, smStr] = s.startTime.split(':');
        const [ehStr, emStr] = s.endTime.split(':');
        const sh = Number(shStr) || 0;
        const sm = Number(smStr) || 0;
        const eh = Number(ehStr) || 0;
        const em = Number(emStr) || 0;

        const mins = (eh * 60 + em) - (sh * 60 + sm);
        const subj = info.subject || 'Altro';
        acc.subjects[subj] = (acc.subjects[subj] || 0) + 1;
        return {
            totalMinutes: acc.totalMinutes + (mins > 0 ? mins : 60),
            conceptsCount: acc.conceptsCount + (info.keyConcepts?.length || 0),
            sessions: acc.sessions + 1,
            subjects: acc.subjects
        };
    }, { totalMinutes: 0, conceptsCount: 0, sessions: 0, subjects: {} as Record<string, number> });
  }, [studySessions]);

  const mostFrequentSubject = Object.entries(stats.subjects).sort((a,b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'Nessuna';

  const handleAddSession = async (e: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const inputToUse = overrideInput || studyInput;

    if (!inputToUse.trim() && attachments.length === 0) return;

    setLoading(true);
    try {
        const studyDetails = await calculateStudySession(inputToUse, attachments);
        const title = `${studyDetails.subject}: ${studyDetails.topic}`;
        const [h, m] = startTime.split(':').map(Number);
        const totalMins = h * 60 + m + duration;
        const endH = Math.floor(totalMins / 60) % 24;
        const endM = totalMins % 60;
        const endTime = `${endH.toString().padStart(2,'0')}:${endM.toString().padStart(2,'0')}`;
        const detailsString = `Metodo: ${studyDetails.method}. Focus: ${studyDetails.keyConcepts.join(', ')}`;

        onAddStudySession(title, startTime, endTime, 'study', detailsString, [], attachments, date.toISOString().split('T')[0], studyDetails);
        setStudyInput('');
        setAttachments([]);
        setIsInputOpen(false);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpdateGoals = (e: React.FormEvent) => {
      e.preventDefault();
      setIsEditingGoals(false);
  };

  const handlePlanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      setImportingPlan(true);
      try {
          const file = files[0];
          const base64Data = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64String = reader.result as string;
                  resolve(base64String.split(',')[1]);
              };
              reader.readAsDataURL(file);
          });

          const uploadedFile: UploadedFile = {
              name: file.name,
              mimeType: file.type,
              data: base64Data
          };

          const planData = await analyzeStudyPlan([uploadedFile]);

          if (planData.goals) {
              setStudyGoals({
                  dailyHours: planData.goals.dailyStudyHours || 4,
                  weeklySessions: planData.goals.sessionsPerWeek || 5
              });
          }

          if (planData.todaysSessions && planData.todaysSessions.length > 0) {
              planData.todaysSessions.forEach(session => {
                  const startTime = session.suggestedTime || "09:00";
                  const dur = session.durationMinutes || 60;
                  const [h, m] = startTime.split(':').map(Number);
                  const totalMins = h * 60 + m + dur;
                  const endTime = `${Math.floor(totalMins / 60) % 24}:${(totalMins % 60).toString().padStart(2, '0')}`;
                  
                  const studyInfo: StudyInfo = {
                      subject: session.subject || 'Generico',
                      topic: session.topic || 'Studio',
                      method: session.method || 'Pomodoro',
                      keyConcepts: session.keyConcepts || []
                  };

                  const details = `Metodo: ${studyInfo.method}. Focus: ${studyInfo.keyConcepts.join(', ')}`;

                  onAddStudySession(
                      `${studyInfo.subject}: ${studyInfo.topic}`,
                      startTime,
                      endTime,
                      'study',
                      details,
                      [],
                      [uploadedFile],
                      date.toISOString().split('T')[0],
                      studyInfo
                  );
              });
          }

      } catch (error) {
          console.error("Import error", error);
          alert("Errore durante l'importazione del piano.");
      } finally {
          setImportingPlan(false);
          if (planInputRef.current) planInputRef.current.value = ''; 
      }
  };

  const QuickAddItem = ({ label }: { label: string }) => (
      <button 
        type="button"
        onClick={(e) => handleAddSession(e as any, label)}
        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-all active:scale-95"
      >
          {label}
      </button>
  );

  const MethodTag = ({ method }: { method: string }) => {
      const config: any = {
          'Pomodoro': { color: 'bg-red-50 text-red-600', icon: Timer },
          'Deep Work': { color: 'bg-indigo-50 text-indigo-600', icon: Brain },
          'Ripasso': { color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
          'Esercizi': { color: 'bg-amber-50 text-amber-600', icon: PenTool }
      };
      const conf = config[method] || { color: 'bg-slate-50 text-slate-600', icon: BookOpen };
      const Icon = conf.icon;
      return (
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-transparent ${conf.color}`}>
              <Icon size={10} /> {method}
          </span>
      );
  }

  // --- DASHBOARD COMPONENTS ---
  
  const StudyRing = () => {
      const size = 160; 
      const center = size / 2;
      const strokeWidth = 12;
      const radius = center - strokeWidth;
      const circumference = 2 * Math.PI * radius;
      
      const hoursStudied = stats.totalMinutes / 60;
      const progress = Math.min(hoursStudied / studyGoals.dailyHours, 1);
      const strokeDashoffset = circumference - progress * circumference;

      return (
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
              <svg className="transform -rotate-90 w-full h-full">
                  <circle cx={center} cy={center} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
                  <circle 
                    cx={center} cy={center} r={radius} 
                    stroke="currentColor" 
                    strokeWidth={strokeWidth} 
                    fill="transparent" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                    className="text-violet-600 transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{Math.round(hoursStudied * 10) / 10}</span>
                    <span className="text-sm font-bold text-slate-400">h</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">/{studyGoals.dailyHours} Ore Goal</span>
              </div>
          </div>
      );
  };

  const SubjectBars = () => (
      <div className="w-full flex flex-col justify-center h-full gap-4">
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                 <span className="text-2xl font-black text-slate-800 mb-1">{stats.sessions}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sessioni</span>
             </div>
             <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                 <span className="text-2xl font-black text-slate-800 mb-1">{stats.conceptsCount}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Concetti</span>
             </div>
          </div>

          <div className="bg-gradient-to-r from-violet-500 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-violet-200 text-white flex justify-between items-center">
              <div>
                  <span className="block text-[10px] font-bold opacity-80 uppercase mb-1">Focus Principale</span>
                  <span className="text-lg font-bold leading-none truncate block max-w-[150px]">{mostFrequentSubject}</span>
              </div>
              <div className="bg-white/20 p-2 rounded-xl">
                  <Brain size={20} />
              </div>
          </div>

          {activeSubs.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 px-1">
                      <CreditCard size={14} className="text-indigo-500" />
                      <span className="text-[10px] font-bold text-indigo-700 uppercase">Risorse Premium</span>
                  </div>
                  <div className="flex gap-1">
                      {activeSubs.map(s => (
                          <span key={s.id} className="text-[9px] font-bold bg-white text-indigo-600 px-2 py-1 rounded-lg border border-indigo-200">{s.name}</span>
                      ))}
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-y-auto pb-20 lg:pb-0 scroll-smooth">
        
        {/* DASHBOARD AREA */}
        <div className="bg-white p-6 lg:p-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 z-10 relative">
            
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Study Planner</h2>
                    <p className="text-sm font-medium text-slate-400 flex items-center gap-1">
                        <GraduationCap size={16} /> Knowledge Tracker
                    </p>
                </div>
                
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={planInputRef} 
                        onChange={handlePlanFileChange} 
                        className="hidden" 
                        accept="application/pdf,image/*"
                    />
                    
                    <button 
                        onClick={() => planInputRef.current?.click()}
                        disabled={importingPlan}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
                    >
                        {importingPlan ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                        <span className="hidden sm:inline">{importingPlan ? 'Analisi in corso...' : 'Importa Piano'}</span>
                    </button>

                    <button 
                        onClick={() => setIsEditingGoals(!isEditingGoals)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
                        title={isEditingGoals ? "Chiudi" : "Modifica Obiettivi"}
                    >
                        {isEditingGoals ? <X size={20} /> : <Settings size={20} />}
                    </button>
                </div>
            </div>

            {isEditingGoals ? (
                 <form onSubmit={handleUpdateGoals} className="max-w-xl mx-auto animate-in fade-in slide-in-from-top-2 py-4">
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Ore di Studio Giornaliere</label>
                            <input type="number" value={studyGoals.dailyHours} onChange={e => setStudyGoals({...studyGoals, dailyHours: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-800 text-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Sessioni Settimanali</label>
                            <input type="number" value={studyGoals.weeklySessions} onChange={e => setStudyGoals({...studyGoals, weeklySessions: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-colors mt-8 shadow-xl shadow-slate-200">
                        <Save size={18} /> Salva Obiettivi
                    </button>
                </form>
            ) : (
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-stretch">
                    <div className="flex flex-col items-center gap-4">
                        <StudyRing />
                    </div>
                    <div className="flex-1 w-full">
                        <SubjectBars />
                    </div>
                </div>
            )}
        </div>

        {/* INPUT & LIST CONTAINER */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 pt-8">
            
            {/* INPUT CARD */}
            <div className={`bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-white overflow-hidden transition-all duration-500 ${isInputOpen ? 'ring-4 ring-slate-50' : ''}`}>
                {!isInputOpen ? (
                    <div className="p-2 flex items-center gap-2">
                        <button 
                            onClick={() => setIsInputOpen(true)}
                            className="flex-1 bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl flex items-center gap-4 transition-colors group text-left"
                        >
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-300 group-hover:scale-105 transition-transform">
                                <Plus size={24} />
                            </div>
                            <div>
                                <span className="font-bold text-slate-800 block text-lg">Pianifica Sessione</span>
                                <span className="text-xs text-slate-400 font-medium">Genera piano di studio con AI</span>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="p-6 animate-in slide-in-from-top-4">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Zap size={20} className="text-violet-500" />
                                AI Study Planner
                            </h3>
                            <button onClick={() => setIsInputOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                <ChevronUp size={20} />
                            </button>
                        </div>

                        {/* Quick Suggestions */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
                            <QuickAddItem label="Matematica" />
                            <QuickAddItem label="Storia" />
                            <QuickAddItem label="Inglese" />
                            <QuickAddItem label="Ripasso Generale" />
                        </div>

                        <form onSubmit={(e) => handleAddSession(e)}>
                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <div className="flex gap-2">
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 w-32">
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Inizio</span>
                                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-transparent font-bold text-slate-900 w-full text-lg focus:outline-none" />
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 w-24">
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Minuti</span>
                                        <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="bg-transparent font-bold text-slate-900 w-full text-lg focus:outline-none text-center" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={studyInput}
                                        onChange={(e) => setStudyInput(e.target.value)}
                                        placeholder="Argomento (es. Storia Romana)"
                                        className="w-full h-full bg-slate-50 rounded-2xl px-5 text-lg font-bold text-slate-900 placeholder-slate-300 focus:outline-none border-2 border-transparent focus:border-slate-900 focus:bg-white transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <FileUploader uploadedFiles={attachments} onFileUpload={setAttachments} onFileRemove={(i) => setAttachments(prev => prev.filter((_, idx) => idx !== i))} />
                            
                            <button 
                                type="submit" 
                                disabled={(!studyInput.trim() && attachments.length === 0) || loading}
                                className="w-full mt-4 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-70 disabled:shadow-none hover:-translate-y-0.5"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <Library size={20} />}
                                Pianifica Sessione
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* SESSIONS LIST */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-2 mb-4">
                    <Activity size={14} /> Programma Odierno
                </h3>
                
                {studySessions.length === 0 ? (
                     <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold text-sm">Nessuna sessione di studio.</p>
                        <p className="text-xs text-slate-400 mt-1">Tempo di imparare qualcosa di nuovo?</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {studySessions.sort((a,b) => a.startTime.localeCompare(b.startTime)).map((session, idx) => {
                            const isExpanded = expandedSessionId === session.id;
                            return (
                                <div 
                                    key={session.id} 
                                    onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                    className={`group bg-white rounded-3xl p-1 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer ${isExpanded ? 'ring-2 ring-slate-100' : ''}`}
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className="flex flex-col sm:flex-row gap-0 sm:gap-4">
                                        {/* Time Column */}
                                        <div className="flex sm:flex-col items-center justify-between sm:justify-center p-4 sm:w-20 bg-slate-50 rounded-2xl sm:rounded-l-2xl sm:rounded-r-none shrink-0">
                                            <span className="text-lg font-black text-slate-700 leading-none">{session.startTime}</span>
                                            <div className="p-2 rounded-lg mt-0 sm:mt-2 bg-white border border-slate-100 text-slate-400">
                                                <BookOpen size={14} />
                                            </div>
                                        </div>

                                        {/* Main Content */}
                                        <div className="flex-1 p-4 pt-0 sm:pt-4 sm:pl-0 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg truncate">{session.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {session.studyInfo && <MethodTag method={session.studyInfo.method} />}
                                                        <p className="text-xs font-medium text-slate-400">fino alle {session.endTime}</p>
                                                    </div>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); onRemoveStudySession(session.id); }} className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            </div>
                                            
                                            {/* Key Concepts - Expanded */}
                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                                                    {session.studyInfo && session.studyInfo.keyConcepts.length > 0 ? (
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Concetti Chiave</span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {session.studyInfo.keyConcepts.map((concept, i) => (
                                                                    <span key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1">
                                                                        <Hash size={10} className="text-violet-400" /> {concept}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-slate-500 italic font-medium">{session.details}</p>
                                                    )}
                                                    
                                                    {session.attachments && session.attachments.length > 0 && (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg mt-3">
                                                            <Paperclip size={12} /> {session.attachments.length} allegati
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {!isExpanded && (
                                                <div className="mt-3 flex justify-center">
                                                    <ChevronDown size={16} className="text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

    </div>
  );
};
