
import React, { useState } from 'react';
import { ChevronRight, Sparkles, Calendar, Zap, Layout, X } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Benvenuto in Kairòs",
      desc: "La tua agenda intelligente che si adatta a te, non il contrario.",
      icon: <Layout size={48} className="text-white" />,
      color: "bg-slate-900"
    },
    {
      title: "Pianificazione Smart",
      desc: "L'AI incastra automaticamente i tuoi task negli spazi liberi della giornata, calcolando anche gli spostamenti.",
      icon: <Calendar size={48} className="text-white" />,
      color: "bg-indigo-600"
    },
    {
      title: "Analisi Documenti",
      desc: "Carica foto di diete, schede palestra o orari: Kairòs estrarrà i dati e creerà gli eventi per te.",
      icon: <Zap size={48} className="text-white" />,
      color: "bg-orange-500"
    },
    {
      title: "Pronto a partire?",
      desc: "Inserisci la tua API Key di Gemini nel profilo per sbloccare la magia AI.",
      icon: <Sparkles size={48} className="text-white" />,
      color: "bg-emerald-600"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
        {/* Background blobs */}
        <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full blur-[100px] opacity-30 transition-colors duration-700 ${currentStep.color}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[100px] opacity-30 transition-colors duration-700 ${currentStep.color}`}></div>

        <div className="w-full max-w-md relative z-10 flex flex-col h-full max-h-[600px] justify-between">
            <div className="flex justify-end">
                <button onClick={onComplete} className="text-slate-400 hover:text-white transition-colors p-2 text-sm font-bold">Salta</button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 animate-in fade-in slide-in-from-bottom-8 duration-500" key={step}>
                <div className={`w-24 h-24 rounded-3xl ${currentStep.color} flex items-center justify-center shadow-2xl mb-8 transform transition-transform hover:scale-105`}>
                    {currentStep.icon}
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-4">{currentStep.title}</h2>
                <p className="text-slate-300 text-lg leading-relaxed">{currentStep.desc}</p>
            </div>

            <div className="w-full space-y-8">
                {/* Dots */}
                <div className="flex justify-center gap-2">
                    {steps.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-white' : 'w-1.5 bg-slate-700'}`}></div>
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="w-full bg-white text-slate-900 font-bold text-lg py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    {step === steps.length - 1 ? "Inizia Ora" : "Avanti"}
                    {step < steps.length - 1 && <ChevronRight size={20} />}
                </button>
            </div>
        </div>
    </div>
  );
};
