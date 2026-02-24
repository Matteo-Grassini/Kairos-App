
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, RotateCcw } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  onUndo?: () => void;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000); 
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const config = {
    success: { icon: CheckCircle2, bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-800' },
    error: { icon: AlertCircle, bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },
    info: { icon: Info, bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-200 shadow-lg' }
  };

  const style = config[toast.type];
  const Icon = style.icon;

  return (
    <div className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-xl border ${style.bg} ${style.border} ${style.text} animate-in slide-in-from-bottom-5 fade-in duration-300`}>
      <Icon size={20} className={toast.type === 'info' ? 'text-indigo-600' : 'text-white'} />
      <span className="text-sm font-bold flex-1">{toast.message}</span>
      
      {toast.onUndo && (
          <button 
            onClick={() => { toast.onUndo?.(); onRemove(toast.id); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${toast.type === 'info' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/20 hover:bg-white/30 text-white'}`}
          >
              <RotateCcw size={12} /> Annulla
          </button>
      )}

      <button onClick={() => onRemove(toast.id)} className="opacity-70 hover:opacity-100 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
};
