
import React, { useState, useEffect } from 'react';
import { X, User, Trash2, HardDrive, Clock, ShieldAlert, Users } from 'lucide-react';
import { getAllLocalUsers, deleteLocalUser } from '../services/firebase';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserUid: string;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, currentUserUid }) => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
        loadUsers();
    }
  }, [isOpen]);

  const loadUsers = () => {
      const all = getAllLocalUsers();
      setUsers(all);
  };

  const handleDelete = (uid: string, name: string) => {
      if (confirm(`Sei sicuro di voler eliminare l'utente "${name}" e TUTTI i suoi dati? Questa azione è irreversibile.`)) {
          deleteLocalUser(uid);
          loadUsers();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Users size={24} className="text-indigo-600 dark:text-indigo-400" />
                    Gestione Dispositivo
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gestisci i profili salvati su questo computer.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50 flex-1 custom-scrollbar">
            {users.length === 0 ? (
                <p className="text-center text-slate-400">Nessun utente trovato.</p>
            ) : (
                users.map((u) => {
                    const isMe = u.uid === currentUserUid;
                    return (
                        <div key={u.uid} className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${isMe ? 'border-indigo-200 dark:border-indigo-900 shadow-sm' : 'border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isMe ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {u.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        {u.displayName}
                                        {isMe && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">Tu</span>}
                                    </h4>
                                    <p className="text-xs text-slate-400">{u.email}</p>
                                    
                                    <div className="flex gap-3 mt-1.5">
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                            <HardDrive size={10} /> {u.dataSizeKB} KB
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                            <Clock size={10} /> Ultimo: {new Date(u.lastLogin).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {!isMe && (
                                <button 
                                    onClick={() => handleDelete(u.uid, u.displayName)}
                                    className="p-3 bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                    title="Elimina Utente e Dati"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    );
                })
            )}
        </div>

        <div className="p-4 bg-slate-100 dark:bg-slate-900 text-center">
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldAlert size={12} />
                Solo gli utenti di questo dispositivo sono visibili qui.
            </p>
        </div>
      </div>
    </div>
  );
};
