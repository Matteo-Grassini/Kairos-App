
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Timer, Coffee, Brain, Settings, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { playSound } from '../services/soundService';

interface FocusTimerProps {
  onClose: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ onClose }) => {
  // Configuration State
  const [config, setConfig] = useState({
      focusDuration: 25,
      breakDuration: 5
  });

  // Timer State
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);

  // Inputs Refs for direct editing
  const minInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(interval);
            setIsActive(false);
            playSound.notification();
            handleCycleComplete();
          } else {
            setMinutes(prev => prev - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(prev => prev - 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, minutes]);

  const handleCycleComplete = () => {
      // Auto-switch logic
      if (mode === 'focus') {
          setMode('break');
          setMinutes(config.breakDuration);
          setSeconds(0);
      } else {
          setMode('focus');
          setMinutes(config.focusDuration);
          setSeconds(0);
      }
  };

  const toggleTimer = () => {
    if (isEditingTime) setIsEditingTime(false);
    setIsActive(!isActive);
    playSound.click();
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsEditingTime(false);
    setMinutes(mode === 'focus' ? config.focusDuration : config.breakDuration);
    setSeconds(0);
    playSound.click();
  };

  const toggleMode = () => {
      const newMode = mode === 'focus' ? 'break' : 'focus';
      setMode(newMode);
      setMinutes(newMode === 'focus' ? config.focusDuration : config.breakDuration);
      setSeconds(0);
      setIsActive(false);
  };

  const handleTimeEdit = (e: React.ChangeEvent<HTMLInputElement>, field: 'min' | 'sec') => {
      let val = parseInt(e.target.value) || 0;
      if (val < 0) val = 0;
      if (field === 'sec' && val > 59) val = 59;
      if (field === 'min' && val > 99) val = 99;
      
      if (field === 'min') setMinutes(val);
      if (field === 'sec') setSeconds(val);
  };

  return (
    <div className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-[70] animate-in slide-in-from-bottom-4 zoom-in duration-300">
        <div className="bg-slate-900/95 backdrop-blur-xl text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 w-72 relative overflow-hidden">
            
            {/* --- HEADER --- */}
            <div className="flex justify-between items-center mb-6 relative z-10">
                <button 
                    onClick={toggleMode}
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${mode === 'focus' ? 'hover:bg-indigo-500/20' : 'hover:bg-emerald-500/20'}`}
                >
                    {mode === 'focus' ? <Brain size={16} className="text-indigo-400" /> : <Coffee size={16} className="text-emerald-400" />}
                    <span className="text-xs font-bold uppercase tracking-wider">{mode === 'focus' ? 'Deep Work' : 'Pausa'}</span>
                </button>
                
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setShowSettings(!showSettings)} 
                        className={`p-2 rounded-full transition-all ${showSettings ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                        title="Impostazioni"
                    >
                        <Settings size={16} />
                    </button>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-white/10 rounded-full"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* --- SETTINGS PANEL --- */}
            {showSettings ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 relative z-10">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Durata Focus (min)</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="range" 
                                min="5" max="90" step="5"
                                value={config.focusDuration}
                                onChange={(e) => setConfig({ ...config, focusDuration: Number(e.target.value) })}
                                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <span className="text-sm font-bold w-8 text-right">{config.focusDuration}</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Durata Pausa (min)</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="range" 
                                min="1" max="30" step="1"
                                value={config.breakDuration}
                                onChange={(e) => setConfig({ ...config, breakDuration: Number(e.target.value) })}
                                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-sm font-bold w-8 text-right">{config.breakDuration}</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setShowSettings(false);
                            // Apply changes immediately if inactive
                            if (!isActive) {
                                setMinutes(mode === 'focus' ? config.focusDuration : config.breakDuration);
                                setSeconds(0);
                            }
                        }}
                        className="w-full py-2 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors mt-2"
                    >
                        Salva e Chiudi
                    </button>
                </div>
            ) : (
                /* --- TIMER FACE --- */
                <div className="animate-in fade-in zoom-in duration-300 relative z-10">
                    <div className="text-center mb-6 relative">
                        {/* Time Display / Input */}
                        <div 
                            onClick={() => { if(!isActive) setIsEditingTime(true); }}
                            className={`text-6xl font-black font-mono tracking-tighter tabular-nums flex justify-center items-center gap-1 transition-all ${isActive ? 'cursor-default' : 'cursor-pointer hover:scale-105 hover:text-indigo-200'}`}
                        >
                            {isEditingTime ? (
                                <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2">
                                    <input 
                                        ref={minInputRef}
                                        type="number" 
                                        value={minutes} 
                                        onChange={(e) => handleTimeEdit(e, 'min')}
                                        className="w-24 bg-transparent text-center focus:outline-none appearance-none m-0 p-0"
                                        autoFocus
                                    />
                                    <span className="pb-2">:</span>
                                    <input 
                                        type="number" 
                                        value={seconds.toString().padStart(2, '0')} 
                                        onChange={(e) => handleTimeEdit(e, 'sec')}
                                        className="w-24 bg-transparent text-center focus:outline-none appearance-none m-0 p-0"
                                    />
                                </div>
                            ) : (
                                <>
                                    <span>{minutes.toString().padStart(2, '0')}</span>
                                    <span className="text-slate-500 animate-pulse">:</span>
                                    <span>{seconds.toString().padStart(2, '0')}</span>
                                </>
                            )}
                        </div>
                        
                        {!isActive && !isEditingTime && (
                            <p className="text-[10px] text-slate-500 mt-2 font-medium">Tocca i numeri per modificare</p>
                        )}
                        {isEditingTime && (
                            <button onClick={() => setIsEditingTime(false)} className="absolute -right-2 top-1/2 -translate-y-1/2 bg-white text-slate-900 p-1 rounded-full"><Check size={14}/></button>
                        )}
                    </div>

                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={toggleTimer}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg ${isActive ? 'bg-amber-500 text-white shadow-amber-900/20' : 'bg-white text-slate-900 shadow-white/10'}`}
                        >
                            {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                        <button 
                            onClick={resetTimer}
                            className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center active:scale-95"
                        >
                            <RotateCcw size={22} />
                        </button>
                    </div>
                </div>
            )}
            
            {/* Ambient Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20 transition-colors duration-700 ${mode === 'focus' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
        </div>
    </div>
  );
};
