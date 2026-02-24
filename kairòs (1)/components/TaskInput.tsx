import React, { useState } from 'react';
import { Plus, Clock, ShieldAlert, Leaf } from 'lucide-react';
import { TaskType, UploadedFile } from '../types';
import { FileUploader } from './FileUploader';

interface TaskInputProps {
  onAddTask: (title: string, type: TaskType, minutes: number, attachments: UploadedFile[]) => void;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask }) => {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState<number>(30);
  const [type, setType] = useState<TaskType>('Flessibile');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(title, type, minutes, attachments);
    setTitle('');
    setMinutes(30);
    setType('Flessibile');
    setAttachments([]);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 transition-all focus-within:ring-2 focus-within:ring-indigo-100">
      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nuova attività..."
          className="w-full text-lg font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
        />
        
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock size={16} className="text-slate-400" />
            <input
              type="number"
              min="5"
              step="5"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-12 bg-transparent focus:outline-none text-center font-semibold text-slate-700"
            />
            <span className="text-slate-500">min</span>
          </div>

          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
                type="button"
                onClick={() => setType('Flessibile')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    type === 'Flessibile' 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-400 hover:text-emerald-500'
                }`}
            >
                <Leaf size={14} />
                Flessibile
            </button>
            <button
                type="button"
                onClick={() => setType('Inderogabile')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    type === 'Inderogabile' 
                    ? 'bg-white text-red-600 shadow-sm' 
                    : 'text-slate-400 hover:text-red-500'
                }`}
            >
                <ShieldAlert size={14} />
                Inderogabile
            </button>
          </div>

          <div className="border-l border-slate-200 pl-2">
            <FileUploader 
                uploadedFiles={attachments}
                onFileUpload={setAttachments}
                onFileRemove={(index) => setAttachments(prev => prev.filter((_, i) => i !== index))}
                compact
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                type === 'Inderogabile' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Plus size={18} />
            Aggiungi
          </button>
        </div>
      </div>
    </form>
  );
};