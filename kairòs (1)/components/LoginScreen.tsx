
import React, { useState } from 'react';
import { Layout, ArrowRight, Cloud, Lock, User, AlertCircle, Loader2, LogIn, UserPlus } from 'lucide-react';
import { loginWithEmail, registerWithEmail } from '../services/firebase';

interface LoginScreenProps {
  onGuestLogin: (user: any) => void;
}

type AuthMode = 'login' | 'register';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGuestLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
          if (mode === 'login') {
              if (!email || !password) throw new Error("Inserisci email e password.");
              const user = await loginWithEmail(email, password);
              onGuestLogin(user);
          } else {
              if (!email || !password || !name) throw new Error("Compila tutti i campi.");
              const user = await registerWithEmail(name, email, password);
              onGuestLogin(user);
          }
      } catch (err: any) {
          setError(err.message || "Errore di autenticazione. Controlla le credenziali.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-white">
      
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>

      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-8 lg:p-10 relative z-10 animate-in fade-in zoom-in duration-500">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-900 mb-4 shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500">
                <Layout size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Kairòs Cloud</h1>
            <p className="text-slate-400 text-sm font-medium mt-1 flex items-center gap-2">
                <Cloud size={14} className="text-emerald-400" /> Sincronizzato con Supabase
            </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-black/20 p-1 rounded-2xl mb-6 relative">
            <button 
                onClick={() => setMode('login')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all relative z-10 ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
                <LogIn size={14} /> Accedi
            </button>
            <button 
                onClick={() => setMode('register')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all relative z-10 ${mode === 'register' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
                <UserPlus size={14} /> Registrati
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            
            {mode === 'register' && (
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-wider">Nome</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors" size={20} />
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Il tuo nome"
                            className="w-full bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white placeholder-slate-500 outline-none transition-all"
                        />
                    </div>
                </div>
            )}

            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-wider">Email</label>
                <div className="relative group">
                    <Cloud className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors" size={20} />
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@esempio.com"
                        className="w-full bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white placeholder-slate-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-wider">Password</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors" size={20} />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="******"
                        className="w-full bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white placeholder-slate-500 outline-none transition-all"
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 text-red-400 text-xs font-medium rounded-xl text-center border border-red-500/20 flex items-center justify-center gap-2 animate-in shake">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            <button 
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-indigo-50 font-bold py-4 px-6 rounded-2xl shadow-xl transition-all active:scale-95 group disabled:opacity-70 disabled:scale-100 mt-6"
            >
                {loading ? (
                    <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Connessione...</span>
                ) : (
                    <>
                        <span>{mode === 'login' ? 'Entra in Kairòs' : 'Crea Account Cloud'}</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button 
                type="button"
                onClick={() => onGuestLogin({
                    uid: 'local-guest-' + Date.now(),
                    email: 'guest@local.dev',
                    displayName: 'Sviluppatore Locale',
                    isAnonymous: true,
                    photoURL: null
                })}
                className="text-slate-400 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 mx-auto"
            >
                <Lock size={12} /> Entra in modalità locale (Offline)
            </button>
        </div>
      </div>
    </div>
  );
};
