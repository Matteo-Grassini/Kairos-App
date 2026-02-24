import React, { useState, useMemo } from 'react';
import { PiggyBank, Plus, Car, Home, Plane, Laptop, ShieldCheck, Target, Trash2, ArrowUpRight, Calendar, DollarSign, X, Check, Wallet } from 'lucide-react';
import { SavingsGoal } from '../types';

interface SavingsSectionProps {
  goals: SavingsGoal[];
  onAddGoal: (goal: SavingsGoal) => void;
  onUpdateGoal: (goal: SavingsGoal) => void;
  onRemoveGoal: (id: string) => void;
}

export const SavingsSection: React.FC<SavingsSectionProps> = ({ goals, onAddGoal, onUpdateGoal, onRemoveGoal }) => {
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState<SavingsGoal['icon']>('piggy');
  const [color, setColor] = useState('indigo');

  const totalSaved = useMemo(() => goals.reduce((sum, g) => sum + g.currentAmount, 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((sum, g) => sum + g.targetAmount, 0), [goals]);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const ICONS = [
      { id: 'piggy', icon: PiggyBank, label: 'Generico' },
      { id: 'car', icon: Car, label: 'Auto' },
      { id: 'home', icon: Home, label: 'Casa' },
      { id: 'travel', icon: Plane, label: 'Viaggio' },
      { id: 'tech', icon: Laptop, label: 'Tech' },
      { id: 'emergency', icon: ShieldCheck, label: 'Emergenza' },
  ];

  const COLORS = [
      { id: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-50' },
      { id: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-50' },
      { id: 'orange', bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50' },
      { id: 'pink', bg: 'bg-pink-500', text: 'text-pink-500', light: 'bg-pink-50' },
      { id: 'blue', bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!title || !targetAmount) return;

      onAddGoal({
          id: crypto.randomUUID(),
          title,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount) || 0,
          deadline: deadline || undefined,
          icon: icon as any,
          color
      });

      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
      setIsInputOpen(false);
  };

  const handleDeposit = (goal: SavingsGoal) => {
      const amount = Number(depositAmount);
      if (!amount || amount <= 0) return;
      onUpdateGoal({ ...goal, currentAmount: goal.currentAmount + amount });
      setDepositAmount('');
      setActiveDepositId(null);
  };

  const calculateMonthlyNeed = (goal: SavingsGoal) => {
      if (!goal.deadline) return null;
      const today = new Date();
      const target = new Date(goal.deadline);
      const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
      
      const remaining = goal.targetAmount - goal.currentAmount;
      if (remaining <= 0) return 0;
      if (months <= 0) return remaining; // Due now
      return remaining / months;
  };

  const getIcon = (id: string) => {
      return ICONS.find(i => i.id === id)?.icon || PiggyBank;
  }

  const getColor = (id: string) => {
      return COLORS.find(c => c.id === id) || COLORS[0];
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-y-auto pb-20 lg:pb-0 scroll-smooth">
        
        {/* DASHBOARD HEADER */}
        <div className="bg-white p-6 lg:p-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 z-10 relative">
             <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Salvadanaio</h2>
                    <p className="text-sm font-medium text-slate-400 flex items-center gap-1">
                        <Wallet size={14} /> Obiettivi di Risparmio
                    </p>
                </div>
                
                <button 
                    onClick={() => setIsInputOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
                >
                    <Plus size={16} /> Nuovo Obiettivo
                </button>
            </div>

            <div className="relative h-40 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white overflow-hidden shadow-xl shadow-slate-200">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Patrimonio Totale</span>
                        <PiggyBank size={24} className="opacity-80" />
                    </div>
                    <div>
                        <span className="text-4xl font-black tracking-tight block">{totalSaved.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }}></div>
                            </div>
                            <span className="text-xs font-bold opacity-80">{Math.round(overallProgress)}% del target</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* INPUT MODAL/AREA */}
        {isInputOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-800">Nuovo Obiettivo</h3>
                        <button onClick={() => setIsInputOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Nome Obiettivo</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Nuova Auto" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Target (€)</label>
                                <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="0" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Già salvati (€)</label>
                                <input type="number" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} placeholder="0" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Data Scadenza (Opzionale)</label>
                            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Icona & Colore</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {ICONS.map(i => (
                                    <button 
                                        type="button" 
                                        key={i.id} 
                                        onClick={() => setIcon(i.id as any)}
                                        className={`p-3 rounded-xl border transition-all ${icon === i.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
                                    >
                                        <i.icon size={20} />
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                                {COLORS.map(c => (
                                    <button
                                        type="button"
                                        key={c.id}
                                        onClick={() => setColor(c.id)}
                                        className={`w-8 h-8 rounded-full transition-all ${c.bg} ${color === c.id ? 'ring-4 ring-offset-2 ring-slate-200 scale-110' : 'opacity-50 hover:opacity-100'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-all">
                            Crea Obiettivo
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* GOALS GRID */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
            {goals.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <PiggyBank size={32} />
                    </div>
                    <p className="text-slate-500 font-bold">Nessun obiettivo impostato</p>
                    <p className="text-xs text-slate-400 mt-1">Inizia a risparmiare per i tuoi sogni!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {goals.map((goal) => {
                        const style = getColor(goal.color);
                        const Icon = getIcon(goal.icon);
                        const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                        const monthlyNeed = calculateMonthlyNeed(goal);
                        
                        return (
                            <div key={goal.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                                
                                {/* Background Accent */}
                                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 ${style.bg}`}></div>

                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${style.light} ${style.text}`}>
                                            <Icon size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg leading-tight">{goal.title}</h3>
                                            <span className="text-xs font-medium text-slate-400">Target: {goal.targetAmount}€</span>
                                        </div>
                                    </div>
                                    <button onClick={() => onRemoveGoal(goal.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="mb-2 flex justify-between items-end relative z-10">
                                    <span className="text-3xl font-black text-slate-800 tracking-tight">{goal.currentAmount.toLocaleString()}€</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${style.light} ${style.text}`}>{Math.round(percent)}%</span>
                                </div>

                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-4 relative z-10">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${style.bg}`} style={{ width: `${percent}%` }}></div>
                                </div>

                                <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-6 relative z-10">
                                    {monthlyNeed !== null ? (
                                        <span className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                                            <Calendar size={12} /> {Math.round(monthlyNeed)}€ / mese
                                        </span>
                                    ) : (
                                        <span>Nessuna scadenza</span>
                                    )}
                                    <span>Mancano {goal.targetAmount - goal.currentAmount}€</span>
                                </div>

                                {/* Quick Deposit Area */}
                                {activeDepositId === goal.id ? (
                                    <div className="flex gap-2 animate-in slide-in-from-bottom-2 relative z-10">
                                        <input 
                                            type="number" 
                                            value={depositAmount} 
                                            onChange={e => setDepositAmount(e.target.value)}
                                            placeholder="Importo..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none"
                                            autoFocus
                                        />
                                        <button onClick={() => handleDeposit(goal)} className="p-3 bg-emerald-500 text-white rounded-xl shadow-md hover:bg-emerald-600 transition-colors">
                                            <Check size={18} />
                                        </button>
                                        <button onClick={() => setActiveDepositId(null)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setActiveDepositId(goal.id)}
                                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 relative z-10 active:scale-95"
                                    >
                                        <Plus size={16} /> Aggiungi Fondi
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};