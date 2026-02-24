
import React, { useState } from 'react';
import { Lock, Unlock, Fingerprint } from 'lucide-react';
import { playSound } from '../services/soundService';

interface LockScreenProps {
  onUnlock: () => void;
  userPin?: string;
  isBiometricEnabled?: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, userPin, isBiometricEnabled }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePinInput = (num: number) => {
    const newPin = pin + num;
    setPin(newPin);
    playSound.click();

    if (newPin.length === 4) {
      if (newPin === userPin || !userPin) { // Unlock if correct or no PIN set (fallback)
        setTimeout(() => {
            playSound.success();
            onUnlock();
        }, 200);
      } else {
        setTimeout(() => {
            playSound.error();
            setError(true);
            setPin('');
            setTimeout(() => setError(false), 500);
        }, 200);
      }
    }
  };

  const handleBiometric = () => {
      // Simulation of WebAuthn
      playSound.click();
      setTimeout(() => {
          playSound.success();
          onUnlock();
      }, 800);
  };

  const handleDelete = () => {
      setPin(prev => prev.slice(0, -1));
      playSound.click();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-300">
        
        <div className="flex flex-col items-center gap-6 mb-10">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center shadow-2xl border border-slate-700">
                <Lock size={40} className="text-indigo-500" />
            </div>
            <div className="text-center">
                <h2 className="text-2xl font-black tracking-tight">Kairòs Locked</h2>
                <p className="text-slate-400 text-sm mt-1">Inserisci il PIN per accedere</p>
            </div>
        </div>

        {/* PIN DOTS */}
        <div className="flex gap-4 mb-12">
            {[0, 1, 2, 3].map(i => (
                <div 
                    key={i} 
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        i < pin.length 
                        ? 'bg-indigo-500 scale-110' 
                        : error 
                            ? 'bg-red-500/50' 
                            : 'bg-slate-700'
                    } ${error ? 'animate-pulse' : ''}`}
                ></div>
            ))}
        </div>

        {/* NUMPAD */}
        <div className="grid grid-cols-3 gap-6 max-w-xs w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                    key={num}
                    onClick={() => handlePinInput(num)}
                    className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 transition-all flex items-center justify-center text-2xl font-bold border border-slate-700 shadow-lg mx-auto"
                >
                    {num}
                </button>
            ))}
            
            <div className="flex items-center justify-center">
                {isBiometricEnabled && (
                    <button 
                        onClick={handleBiometric}
                        className="w-16 h-16 rounded-full text-emerald-500 hover:bg-emerald-500/10 transition-colors flex items-center justify-center"
                    >
                        <Fingerprint size={32} />
                    </button>
                )}
            </div>

            <button
                onClick={() => handlePinInput(0)}
                className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 transition-all flex items-center justify-center text-2xl font-bold border border-slate-700 shadow-lg mx-auto"
            >
                0
            </button>

            <button
                onClick={handleDelete}
                className="w-16 h-16 rounded-full text-slate-400 hover:text-white transition-colors flex items-center justify-center mx-auto"
            >
                <span className="text-lg font-bold">CANC</span>
            </button>
        </div>

    </div>
  );
};
