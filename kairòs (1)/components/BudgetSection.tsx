import React, { useState, useMemo, useRef } from 'react';
import { Wallet, Plus, TrendingUp, TrendingDown, CreditCard, ShoppingBag, Home, Coffee, Car, Heart, Zap, Briefcase, ChevronUp, ChevronDown, Loader2, ScanLine, X, Settings, Save, Trash2, PiggyBank, DollarSign, BarChart3, Filter, ArrowUpRight, ArrowDownRight, Calendar, Plane, Laptop, ShieldCheck, Check, Repeat, RefreshCw, AlertCircle } from 'lucide-react';
import { Transaction, BudgetCategory, TransactionType, UploadedFile, SavingsGoal, Subscription } from '../types';
import { analyzeReceipt, analyzeBudgetPlan } from '../services/geminiService';
import { FileUploader } from './FileUploader';

interface BudgetSectionProps {
  currentDate: Date;
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onRemoveTransaction: (id: string) => void;
  // Savings Props
  savingsGoals: SavingsGoal[];
  onAddSavingsGoal: (goal: SavingsGoal) => void;
  onUpdateSavingsGoal: (goal: SavingsGoal) => void;
  onRemoveSavingsGoal: (id: string) => void;
  // Subscription Props
  subscriptions: Subscription[];
  onAddSubscription: (sub: Subscription) => void;
  onRemoveSubscription: (id: string) => void;
}

// --- CONFIGS & HELPERS (Moved outside component) ---
const getCategoryConfig = (cat: BudgetCategory) => {
    switch(cat) {
        case 'Housing': return { icon: Home, color: 'text-blue-500', bg: 'bg-blue-50' };
        case 'Food': return { icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-50' };
        case 'Transport': return { icon: Car, color: 'text-zinc-500', bg: 'bg-zinc-50' };
        case 'Leisure': return { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50' };
        case 'Shopping': return { icon: ShoppingBag, color: 'text-pink-500', bg: 'bg-pink-50' };
        case 'Health': return { icon: Heart, color: 'text-red-500', bg: 'bg-red-50' };
        case 'Services': return { icon: CreditCard, color: 'text-cyan-500', bg: 'bg-cyan-50' };
        case 'Income': return { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' };
        case 'Investments': return { icon: PiggyBank, color: 'text-indigo-500', bg: 'bg-indigo-50' };
        default: return { icon: Wallet, color: 'text-slate-500', bg: 'bg-slate-50' };
    }
};

interface CategoryPillProps {
    cat: string;
    amount: number;
    totalExpenses: number;
    selectedCategory: string;
    onSelectCategory: (cat: BudgetCategory | 'All') => void;
}

const CategoryPill: React.FC<CategoryPillProps> = ({ cat, amount, totalExpenses, selectedCategory, onSelectCategory }) => {
    const conf = getCategoryConfig(cat as BudgetCategory);
    const Icon = conf.icon;
    const isSelected = selectedCategory === cat;
    
    return (
        <button 
          onClick={() => onSelectCategory(isSelected ? 'All' : cat as BudgetCategory)}
          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95 text-left w-full
              ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700'}
          `}
        >
            <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20 text-white' : `${conf.bg} ${conf.color}`}`}>
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <span className="block text-xs font-bold truncate">{cat}</span>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isSelected ? 'bg-white' : conf.color.replace('text-', 'bg-')}`} 
                      style={{ width: `${Math.min((amount / totalExpenses) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>
            <span className="text-xs font-bold">{Math.round(amount)}€</span>
        </button>
    );
};

export const BudgetSection: React.FC<BudgetSectionProps> = ({ 
    currentDate, transactions, onAddTransaction, onRemoveTransaction,
    savingsGoals, onAddSavingsGoal, onUpdateSavingsGoal, onRemoveSavingsGoal,
    subscriptions, onAddSubscription, onRemoveSubscription
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'savings' | 'subscriptions'>('overview');
  const [loading, setLoading] = useState(false);
  const [importingPlan, setImportingPlan] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | 'All'>('All');
  
  // Settings
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [budgetSettings, setBudgetSettings] = useState({
      monthlyLimit: 2000,
      savingsGoal: 200
  });

  // Transaction Input State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BudgetCategory>('Food');
  const [type, setType] = useState<TransactionType>('expense');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  // Savings Input State
  const [isGoalInputOpen, setIsGoalInputOpen] = useState(false);
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState<SavingsGoal['icon']>('piggy');
  const [color, setColor] = useState('indigo');

  // Subscription Input State
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subCycle, setSubCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subNextDate, setSubNextDate] = useState('');
  const [subCategory, setSubCategory] = useState<BudgetCategory>('Services');
  
  const planInputRef = useRef<HTMLInputElement>(null);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const monthlyTransactions = transactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const income = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      // Category Breakdown
      const catBreakdown: Record<string, number> = {};
      monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
          catBreakdown[t.category] = (catBreakdown[t.category] || 0) + t.amount;
      });

      // Daily Average (Expenses)
      const todayDay = new Date().getDate();
      const dailyAverage = todayDay > 0 ? expenses / todayDay : 0;

      // Last 7 Days Data for Graph
      const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dateStr = d.toISOString().split('T')[0];
          const dayExpenses = transactions
              .filter(t => t.date === dateStr && t.type === 'expense')
              .reduce((sum, t) => sum + t.amount, 0);
          return { day: d.toLocaleDateString('it-IT', { weekday: 'short' }), amount: dayExpenses, date: dateStr };
      });

      const maxDayExpense = Math.max(...last7Days.map(d => d.amount), 1); // Avoid div by zero

      return {
          income,
          expenses,
          balance: income - expenses,
          savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
          catBreakdown,
          dailyAverage,
          last7Days,
          maxDayExpense,
          remainingBudget: budgetSettings.monthlyLimit - expenses,
          isOverBudget: expenses > budgetSettings.monthlyLimit
      };
  }, [transactions, currentDate, budgetSettings]);

  // Savings Stats
  const savingsStats = useMemo(() => {
      const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
      const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
      const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
      return { totalSaved, totalTarget, overallProgress };
  }, [savingsGoals]);

  // Subscription Stats
  const subStats = useMemo(() => {
      const monthlyCost = subscriptions.reduce((sum, sub) => {
          return sum + (sub.billingCycle === 'monthly' ? sub.amount : sub.amount / 12);
      }, 0);
      const yearlyProjection = monthlyCost * 12;
      return { monthlyCost, yearlyProjection, count: subscriptions.length };
  }, [subscriptions]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
      let filtered = transactions;
      if (selectedCategory !== 'All') {
          filtered = transactions.filter(t => t.category === selectedCategory);
      }

      const grouped: Record<string, Transaction[]> = {};
      filtered.forEach(t => {
          grouped[t.date] = [...(grouped[t.date] || []), t];
      });
      
      // Sort keys desc
      return Object.entries(grouped).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [transactions, selectedCategory]);

  // --- HANDLERS ---

  const handleAddTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount && attachments.length === 0) return;

      setLoading(true);
      try {
          let finalAmount = parseFloat(amount);
          let finalDesc = description;
          let finalCat = category;
          let finalDate = currentDate.toISOString().split('T')[0];

          // If AI scan
          if (attachments.length > 0 && !amount) {
              const result = await analyzeReceipt(attachments);
              if (result.amount) finalAmount = result.amount;
              if (result.category) finalCat = result.category as BudgetCategory;
              if (result.description) finalDesc = result.description;
              if (result.date) finalDate = result.date;
          }

          if (isNaN(finalAmount)) throw new Error("Importo non valido");

          onAddTransaction({
              amount: finalAmount,
              description: finalDesc || (type === 'income' ? 'Entrata' : 'Spesa'),
              category: finalCat,
              type,
              date: finalDate,
              attachments
          });

          // Reset
          setAmount('');
          setDescription('');
          setAttachments([]);
          setIsInputOpen(false);

      } catch (error) {
          console.error(error);
          alert("Errore nell'aggiunta della transazione.");
      } finally {
          setLoading(false);
      }
  };

  const handleAddSubscription = (e: React.FormEvent) => {
      e.preventDefault();
      if (!subName || !subAmount) return;

      onAddSubscription({
          id: crypto.randomUUID(),
          name: subName,
          amount: parseFloat(subAmount),
          currency: 'EUR',
          billingCycle: subCycle,
          nextRenewalDate: subNextDate || new Date().toISOString().split('T')[0],
          category: subCategory
      });

      setSubName('');
      setSubAmount('');
      setSubNextDate('');
      setIsInputOpen(false);
  };

  const handleSubmitGoal = (e: React.FormEvent) => {
      e.preventDefault();
      if (!goalTitle || !targetAmount) return;

      onAddSavingsGoal({
          id: crypto.randomUUID(),
          title: goalTitle,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount) || 0,
          deadline: deadline || undefined,
          icon: icon as any,
          color
      });

      setGoalTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
      setIsGoalInputOpen(false);
  };

  const handleDeposit = (goal: SavingsGoal) => {
      const amount = Number(depositAmount);
      if (!amount || amount <= 0) return;
      onUpdateSavingsGoal({ ...goal, currentAmount: goal.currentAmount + amount });
      setDepositAmount('');
      setActiveDepositId(null);
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

          const uploadedFile: UploadedFile = { name: file.name, mimeType: file.type, data: base64Data };
          const planData = await analyzeBudgetPlan([uploadedFile]);

          if (planData.monthlyBudget) {
              setBudgetSettings(prev => ({ ...prev, monthlyLimit: planData.monthlyBudget }));
          }
          
          if (planData.detectedTransactions) {
              planData.detectedTransactions.forEach(t => {
                  onAddTransaction({
                      amount: t.amount,
                      description: t.description,
                      category: t.category,
                      type: t.type,
                      date: t.date || currentDate.toISOString().split('T')[0],
                      attachments: [uploadedFile]
                  });
              });
          }

      } catch (error) {
          console.error("Import error", error);
      } finally {
          setImportingPlan(false);
          if (planInputRef.current) planInputRef.current.value = ''; 
      }
  };

  const getDaysUntilRenewal = (dateStr: string) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const renewal = new Date(dateStr);
      renewal.setHours(0,0,0,0);
      
      // If date is in past, assume next month/year
      while (renewal < today) {
          renewal.setMonth(renewal.getMonth() + 1); // Simple increment for now
      }
      
      const diffTime = renewal.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const SAVINGS_ICONS = [
      { id: 'piggy', icon: PiggyBank, label: 'Generico' },
      { id: 'car', icon: Car, label: 'Auto' },
      { id: 'home', icon: Home, label: 'Casa' },
      { id: 'travel', icon: Plane, label: 'Viaggio' },
      { id: 'tech', icon: Laptop, label: 'Tech' },
      { id: 'emergency', icon: ShieldCheck, label: 'Emergenza' },
  ];

  const SAVINGS_COLORS = [
      { id: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-50' },
      { id: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-50' },
      { id: 'orange', bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50' },
      { id: 'pink', bg: 'bg-pink-500', text: 'text-pink-500', light: 'bg-pink-50' },
      { id: 'blue', bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50' },
  ];

  const getSavingsIcon = (id: string) => SAVINGS_ICONS.find(i => i.id === id)?.icon || PiggyBank;
  const getSavingsColor = (id: string) => SAVINGS_COLORS.find(c => c.id === id) || SAVINGS_COLORS[0];

  const calculateMonthlyNeed = (goal: SavingsGoal): number | null => {
      if (!goal.deadline) return null;
      const today = new Date();
      const target = new Date(goal.deadline);
      const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
      const remaining = goal.targetAmount - goal.currentAmount;
      if (remaining <= 0) return 0;
      if (months <= 0) return remaining; 
      return remaining / months;
  };

  // --- SUB-COMPONENTS ---

  const SpendingGraph = () => (
      <div className="flex items-end justify-between h-32 gap-2 mt-4 px-2">
          {stats.last7Days.map((d, i) => {
              const heightPercent = (d.amount / stats.maxDayExpense) * 100;
              const isToday = i === 6;
              return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                      <div className="w-full relative flex items-end justify-center h-full">
                          <div 
                            className={`w-full max-w-[24px] rounded-t-lg transition-all duration-700 ease-out ${isToday ? 'bg-indigo-500' : 'bg-indigo-200 group-hover:bg-indigo-300'}`}
                            style={{ height: `${Math.max(heightPercent, 5)}%` }}
                          ></div>
                          <div className="absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {d.amount.toFixed(0)}€
                          </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{d.day.charAt(0)}</span>
                  </div>
              )
          })}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-y-auto pb-20 lg:pb-0 scroll-smooth">
        
        {/* TOP DASHBOARD */}
        <div className="bg-white p-6 lg:p-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 z-10 relative">
             <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Financial Hub</h2>
                    <p className="text-sm font-medium text-slate-400 flex items-center gap-1">
                        <BarChart3 size={14} /> Gestione Finanziaria
                    </p>
                </div>
                
                {/* Tab Switcher */}
                <div className="bg-slate-100 p-1 rounded-xl flex w-full md:w-auto overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Flusso
                    </button>
                    <button 
                        onClick={() => setActiveTab('subscriptions')}
                        className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'subscriptions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Abbonamenti
                    </button>
                    <button 
                        onClick={() => setActiveTab('savings')}
                        className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'savings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Salvadanaio
                    </button>
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end">
                    <input type="file" ref={planInputRef} onChange={handlePlanFileChange} className="hidden" accept="application/pdf,image/*" />
                    <button 
                        onClick={() => planInputRef.current?.click()}
                        disabled={importingPlan}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
                        title="Importa Estratto Conto"
                    >
                        {importingPlan ? <Loader2 size={20} className="animate-spin" /> : <ScanLine size={20} />}
                    </button>
                    <button 
                        onClick={() => setIsEditingSettings(!isEditingSettings)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
                    >
                        {isEditingSettings ? <X size={20} /> : <Settings size={20} />}
                    </button>
                </div>
            </div>

            {isEditingSettings ? (
                 <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-top-2 py-4">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Budget Mensile (€)</label>
                            <input type="number" value={budgetSettings.monthlyLimit} onChange={e => setBudgetSettings({...budgetSettings, monthlyLimit: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-800 text-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block ml-1">Obiettivo Risparmio (€)</label>
                            <input type="number" value={budgetSettings.savingsGoal} onChange={e => setBudgetSettings({...budgetSettings, savingsGoal: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-800 text-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                        </div>
                    </div>
                    <button onClick={() => setIsEditingSettings(false)} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-colors mt-8 shadow-xl shadow-slate-200">
                        <Save size={18} /> Salva Impostazioni
                    </button>
                </div>
            ) : activeTab === 'overview' ? (
                // --- OVERVIEW TAB ---
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch animate-in fade-in duration-300">
                    <div className="flex-1 flex flex-col gap-6">
                        <div className="flex items-end gap-3">
                            <span className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter">
                                {stats.remainingBudget.toFixed(0)}€
                            </span>
                            <div className="mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase block">Disponibili</span>
                                <span className={`text-xs font-bold ${stats.savingsRate >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {stats.savingsRate >= 0 ? '+' : ''}{Math.round(stats.savingsRate)}% Risparmio
                                </span>
                            </div>
                        </div>

                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Trend 7 Giorni</span>
                                <span className="text-[10px] font-bold text-slate-500">Media: {stats.dailyAverage.toFixed(0)}€/giorno</span>
                            </div>
                            <SpendingGraph />
                        </div>
                    </div>

                    <div className="flex-1 lg:border-l border-slate-100 lg:pl-10">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold uppercase text-slate-400">Top Categorie</span>
                            {selectedCategory !== 'All' && (
                                <button onClick={() => setSelectedCategory('All')} className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 hover:underline">
                                    <X size={10} /> Reset Filtro
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.entries(stats.catBreakdown) as [string, number][])
                                .sort((a,b) => b[1] - a[1])
                                .slice(0, 4)
                                .map(([cat, amount]) => (
                                    <CategoryPill 
                                        key={cat} 
                                        cat={cat} 
                                        amount={amount} 
                                        totalExpenses={stats.expenses}
                                        selectedCategory={selectedCategory}
                                        onSelectCategory={setSelectedCategory}
                                    />
                                ))
                            }
                            {Object.keys(stats.catBreakdown).length === 0 && (
                                <div className="col-span-2 text-center py-8 text-slate-400 text-xs italic">
                                    Nessuna spesa registrata questo mese.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'subscriptions' ? (
                // --- SUBSCRIPTIONS TAB ---
                <div className="animate-in fade-in duration-300">
                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                        <div className="flex-1 bg-slate-900 text-white rounded-3xl p-6 shadow-lg shadow-slate-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Totale Fissi Mensili</p>
                                    <h3 className="text-3xl font-black">{subStats.monthlyCost.toFixed(2)}€</h3>
                                </div>
                                <div className="p-2 bg-white/10 rounded-xl">
                                    <RefreshCw size={24} />
                                </div>
                            </div>
                            <div className="text-xs font-medium opacity-70">
                                Proiezione annuale: ~{subStats.yearlyProjection.toFixed(0)}€
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- SAVINGS TAB ---
                <div className="animate-in fade-in duration-300">
                    <div className="relative h-40 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white overflow-hidden shadow-xl shadow-slate-200">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Patrimonio Totale</span>
                                <PiggyBank size={24} className="opacity-80" />
                            </div>
                            <div>
                                <span className="text-4xl font-black tracking-tight block">{savingsStats.totalSaved.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${savingsStats.overallProgress}%` }}></div>
                                    </div>
                                    <span className="text-xs font-bold opacity-80">{Math.round(savingsStats.overallProgress)}% del target</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* INPUT & LIST AREA */}
        <div className="px-4 md:px-8 max-w-5xl mx-auto w-full space-y-8 pt-8">
            
            {/* --- OVERVIEW TAB CONTENT --- */}
            {activeTab === 'overview' && (
                <>
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
                                        <span className="font-bold text-slate-800 block text-lg">Aggiungi Transazione</span>
                                        <span className="text-xs text-slate-400 font-medium">Scansiona scontrino o inserisci manuale</span>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="p-6 animate-in slide-in-from-top-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <ScanLine size={20} className="text-emerald-500" />
                                        Smart Transaction
                                    </h3>
                                    <button onClick={() => setIsInputOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                        <ChevronUp size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleAddTransaction}>
                                    <div className="flex gap-2 mb-4">
                                        <button type="button" onClick={() => setType('expense')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
                                            <ArrowUpRight size={16} /> Uscita
                                        </button>
                                        <button type="button" onClick={() => setType('income')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2 ${type === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
                                            <ArrowDownRight size={16} /> Entrata
                                        </button>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                        <div className="w-full sm:w-1/3">
                                            <div className="relative">
                                                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 rounded-2xl pl-8 pr-4 py-4 text-xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500" />
                                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione (es. Spesa Coop)" className="w-full h-full bg-slate-50 rounded-2xl px-5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 py-4 sm:py-0" />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <select value={category} onChange={(e: any) => setCategory(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer">
                                            {['Housing', 'Food', 'Transport', 'Leisure', 'Shopping', 'Health', 'Services', 'Investments', 'Other'].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <FileUploader uploadedFiles={attachments} onFileUpload={setAttachments} onFileRemove={(i) => setAttachments(prev => prev.filter((_, idx) => idx !== i))} />
                                    
                                    <button type="submit" disabled={loading} className="w-full mt-4 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-70">
                                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                                        {attachments.length > 0 && !amount ? 'Analizza Scontrino' : 'Salva Transazione'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* LIST */}
                    <div className="space-y-6">
                        {groupedTransactions.length === 0 ? (
                            <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PiggyBank size={32} className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-bold text-sm">Nessuna transazione registrata.</p>
                            </div>
                        ) : (
                            groupedTransactions.map(([date, items]) => {
                                const isToday = date === currentDate.toISOString().split('T')[0];
                                return (
                                    <div key={date}>
                                        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 mb-3">
                                            <Calendar size={12} />
                                            {isToday ? 'Oggi' : new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </h4>
                                        <div className="space-y-3">
                                            {items.map((t) => {
                                                const catConfig = getCategoryConfig(t.category);
                                                const CatIcon = catConfig.icon;
                                                return (
                                                    <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all group">
                                                        <div className={`p-3 rounded-xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                                                            <CatIcon size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-slate-800 text-sm truncate">{t.description}</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                                {t.category}
                                                                {t.attachments.length > 0 && <span className="text-indigo-400">• Allegato</span>}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`block font-black text-base ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}€
                                                            </span>
                                                        </div>
                                                        <button onClick={() => onRemoveTransaction(t.id)} className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {/* --- SUBSCRIPTIONS TAB CONTENT --- */}
            {activeTab === 'subscriptions' && (
                <>
                    {/* INPUT CARD FOR SUBSCRIPTIONS */}
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
                                        <span className="font-bold text-slate-800 block text-lg">Aggiungi Abbonamento</span>
                                        <span className="text-xs text-slate-400 font-medium">Netflix, Palestra, Affitto...</span>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="p-6 animate-in slide-in-from-top-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <RefreshCw size={20} className="text-indigo-500" />
                                        Pagamento Ricorrente
                                    </h3>
                                    <button onClick={() => setIsInputOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                        <ChevronUp size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleAddSubscription}>
                                    <div className="mb-4">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Servizio</label>
                                        <input type="text" value={subName} onChange={e => setSubName(e.target.value)} placeholder="Es. Spotify" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Costo (€)</label>
                                            <input type="number" step="0.01" value={subAmount} onChange={e => setSubAmount(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Ciclo</label>
                                            <select value={subCycle} onChange={(e: any) => setSubCycle(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none appearance-none">
                                                <option value="monthly">Mensile</option>
                                                <option value="yearly">Annuale</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Prossimo Rinnovo</label>
                                            <input type="date" value={subNextDate} onChange={e => setSubNextDate(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Categoria</label>
                                            <select value={subCategory} onChange={(e: any) => setSubCategory(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none appearance-none">
                                                {['Housing', 'Food', 'Transport', 'Leisure', 'Shopping', 'Health', 'Services', 'Investments', 'Other'].map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-all">
                                        Salva Abbonamento
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 mt-6">
                        {subscriptions.length === 0 ? (
                            <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <RefreshCw size={32} className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-bold text-sm">Nessun abbonamento attivo.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {subscriptions.map(sub => {
                                    const daysLeft = getDaysUntilRenewal(sub.nextRenewalDate);
                                    const isSoon = daysLeft <= 3 && daysLeft >= 0;
                                    const catConfig = getCategoryConfig(sub.category);
                                    const CatIcon = catConfig.icon;

                                    return (
                                        <div key={sub.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
                                            {isSoon && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                                            
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${catConfig.bg} ${catConfig.color}`}>
                                                    <CatIcon size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{sub.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded capitalize">{sub.billingCycle === 'monthly' ? 'Mensile' : 'Annuale'}</span>
                                                        <span className={`${isSoon ? 'text-red-500 font-bold flex items-center gap-1' : ''}`}>
                                                            {isSoon && <AlertCircle size={10} />}
                                                            {daysLeft === 0 ? 'Oggi!' : daysLeft < 0 ? 'Scaduto' : `Tra ${daysLeft} gg`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <span className="block font-black text-lg text-slate-900">{sub.amount.toFixed(2)}€</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{sub.category}</span>
                                                </div>
                                                <button onClick={() => onRemoveSubscription(sub.id)} className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* --- SAVINGS TAB CONTENT --- */}
            {activeTab === 'savings' && (
                <>
                    {/* Savings Input Modal */}
                    {isGoalInputOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-lg text-slate-800">Nuovo Obiettivo</h3>
                                    <button onClick={() => setIsGoalInputOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                                        <X size={20} />
                                    </button>
                                </div>
                                
                                <form onSubmit={handleSubmitGoal} className="p-6 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Nome Obiettivo</label>
                                        <input type="text" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="Es. Nuova Auto" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" required />
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
                                            {SAVINGS_ICONS.map(i => (
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
                                            {SAVINGS_COLORS.map(c => (
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
                    
                    <button 
                        onClick={() => setIsGoalInputOpen(true)}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-3 text-sm font-bold active:scale-95 group mb-8"
                    >
                        <div className="p-2 bg-slate-100 rounded-full group-hover:bg-indigo-100 transition-colors">
                            <Plus size={20} />
                        </div>
                        Definisci Nuovo Obiettivo
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
                        {savingsGoals.map((goal: SavingsGoal) => {
                            const style = getSavingsColor(goal.color);
                            const Icon = getSavingsIcon(goal.icon);
                            const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                            const monthlyNeed = calculateMonthlyNeed(goal);
                            
                            return (
                                <div key={goal.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
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
                                        <button onClick={() => onRemoveSavingsGoal(goal.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
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
                                                <Calendar size={12} /> {Math.round(monthlyNeed as number)}€ / mese
                                            </span>
                                        ) : (
                                            <span>Nessuna scadenza</span>
                                        )}
                                        <span>Mancano {Number(goal.targetAmount) - Number(goal.currentAmount)}€</span>
                                    </div>

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
                </>
            )}

        </div>
    </div>
  );
};