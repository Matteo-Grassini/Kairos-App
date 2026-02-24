
import React, { useState } from 'react';
import { Check, X, Sparkles, Zap, Cloud, Crown, Star, Loader2, AlertCircle, Percent, Lock, ExternalLink } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void; // Legacy local upgrade
  user?: any; // Pass user object to handle real payments
}

// INSERISCI QUI IL TUO LINK STRIPE (Crealo su dashboard.stripe.com -> Payment Links)
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_eVaeWQ..."; 

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onUpgrade, user }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePayment = () => {
      setLoading(true);
      
      if (!user || user.uid.startsWith('local_')) {
          // Se è un utente locale (Guest), simula l'upgrade gratuito
          setTimeout(() => {
              onUpgrade();
              setLoading(false);
          }, 1500);
      } else {
          // Se è un utente Cloud, apri il Link di Pagamento Stripe
          // In una app reale, Stripe richiamerebbe il tuo DB (webhook) per confermare il pagamento.
          // Per ora, l'utente paga e tu puoi attivarlo manualmente o usare un webhook in futuro.
          window.open(STRIPE_PAYMENT_LINK, '_blank');
          setLoading(false);
          // Nota: In questa versione semplificata, l'upgrade immediato nella UI non avviene 
          // finché non lo gestisci, ma il pagamento è sicuro.
      }
  };

  const features = [
    { name: "Pianificazione Base", free: true, pro: true },
    { name: "Salvataggio Locale", free: true, pro: true },
    { name: "Kairòs AI (Gemini)", free: "Limitata", pro: "Illimitata" },
    { name: "Cloud Sync Multi-device", free: false, pro: true },
    { name: "Temi Esclusivi (Gold)", free: false, pro: true },
    { name: "Analisi Budget Avanzata", free: false, pro: true },
    { name: "Badge Profilo Verificato", free: false, pro: true },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Header / Brand Side */}
        <div className="md:w-1/3 bg-slate-950 text-white p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-white/10">
                    <Crown size={32} className="text-yellow-400" />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-2">Kairòs <span className="text-yellow-400">Pro</span></h2>
                <p className="text-slate-400 font-medium leading-relaxed">Sblocca il massimo potenziale della tua giornata con l'intelligenza artificiale senza limiti.</p>
            </div>

            <div className="relative z-10 mt-8 md:mt-0">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Sparkles size={18} /></div>
                    <span className="text-sm font-bold">AI Coach Illimitato</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Cloud size={18} /></div>
                    <span className="text-sm font-bold">Sync & Backup</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Star size={18} /></div>
                    <span className="text-sm font-bold">Temi Premium</span>
                </div>
            </div>
        </div>

        {/* Pricing Side */}
        <div className="md:w-2/3 bg-white dark:bg-slate-900 p-6 md:p-10 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Scegli il tuo piano</h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Free Plan */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-3xl p-6 flex flex-col relative opacity-70 hover:opacity-100 transition-opacity">
                    <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider mb-2">Starter</h4>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-6">Gratis</div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Check size={14}/> Funzioni Base</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Check size={14}/> AI Limitata</li>
                        <li className="flex items-center gap-2 text-sm text-slate-400 line-through decoration-slate-300"><X size={14}/> Cloud Sync</li>
                    </ul>
                    <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        Resta Free
                    </button>
                </div>

                {/* Pro Plan */}
                <div className="border-2 border-indigo-600 dark:border-indigo-500 rounded-3xl p-6 flex flex-col relative shadow-xl shadow-indigo-100 dark:shadow-none bg-white dark:bg-slate-800 transform scale-105 z-10">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-2xl rounded-tr-2xl uppercase tracking-wider flex items-center gap-1">
                        <Percent size={10} /> Offerta Lancio
                    </div>
                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-xs tracking-wider mb-2">Pro</h4>
                    <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">€2.99</span>
                        <span className="text-sm font-bold text-slate-400 line-through decoration-slate-400 decoration-2">€4.99</span>
                        <span className="text-sm font-bold text-slate-400">/mese</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white"><Check size={16} className="text-indigo-500"/> Tutto illimitato</li>
                        <li className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white"><Check size={16} className="text-indigo-500"/> Cloud Sync</li>
                        <li className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white"><Check size={16} className="text-indigo-500"/> Supporto Prioritario</li>
                    </ul>
                    <button 
                        onClick={handlePayment} 
                        disabled={loading}
                        className="w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                        {loading ? 'Attendere...' : user?.uid.startsWith('local_') ? 'Prova Gratis' : 'Vai al Pagamento'}
                    </button>
                    <div className="flex justify-center items-center gap-2 mt-3">
                        <Lock size={10} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400">Pagamento sicuro Stripe</span>
                        <ExternalLink size={10} className="text-slate-300" />
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                <table className="w-full text-left text-xs md:text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2 pl-2 text-slate-500 font-medium">Funzionalità</th>
                            <th className="py-2 text-center text-slate-500 font-medium">Free</th>
                            <th className="py-2 text-center text-indigo-600 font-bold">Pro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {features.map((f, i) => (
                            <tr key={i}>
                                <td className="py-3 pl-2 font-medium text-slate-700 dark:text-slate-200">{f.name}</td>
                                <td className="py-3 text-center text-slate-500">
                                    {f.free === true ? <Check size={16} className="mx-auto"/> : f.free === false ? <X size={16} className="mx-auto opacity-50"/> : f.free}
                                </td>
                                <td className="py-3 text-center font-bold text-slate-900 dark:text-white">
                                    {f.pro === true ? <Check size={16} className="mx-auto text-emerald-500"/> : f.pro}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};
