
import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Users, Database, HardDrive, 
    Activity, Trash2, LogOut, ShieldAlert, CheckCircle2, 
    Server, Terminal, Cpu, Search, Lock, AlertTriangle, 
    Globe, Settings, MessageSquare, RefreshCcw, Bell, Check,
    MessageSquareWarning, Bug, Lightbulb, HelpCircle, Archive,
    ArrowLeft
} from 'lucide-react';
import { 
    getAllLocalUsers, 
    getSystemStats, 
    deleteLocalUser, 
    nukeSystem, 
    getSystemLogs, 
    addSystemLog, 
    clearSystemCache,
    getGlobalConfig,
    updateGlobalConfig,
    getAllReports,
    deleteReport
} from '../services/firebase';

interface AdminDashboardProps {
    user: any;
    onLogout: () => void;
    onBack?: () => void;
}

type AdminView = 'overview' | 'users' | 'reports' | 'console' | 'config';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onBack }) => {
    const [activeView, setActiveView] = useState<AdminView>('overview');
    const [users, setUsers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [config, setConfig] = useState<any>({ maintenanceMode: false, globalAnnouncement: '' });
    
    const [refreshKey, setRefreshKey] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [announcementInput, setAnnouncementInput] = useState('');

    useEffect(() => {
        setUsers(getAllLocalUsers());
        setStats(getSystemStats());
        setLogs(getSystemLogs());
        setReports(getAllReports());
        const loadedConfig = getGlobalConfig();
        setConfig(loadedConfig);
        setAnnouncementInput(loadedConfig.globalAnnouncement || '');
    }, [refreshKey]);

    const refresh = () => setRefreshKey(prev => prev + 1);

    // --- ACTIONS ---

    const handleDeleteUser = (uid: string, name: string) => {
        if (confirm(`⚠️ SEI SICURO? \nStai per eliminare definitivamente l'utente "${name}" e tutti i suoi dati. Azione irreversibile.`)) {
            deleteLocalUser(uid);
            refresh();
        }
    };

    const handleResolveReport = (id: string) => {
        if(confirm("Segnare come risolto e archiviare questa segnalazione?")) {
            deleteReport(id);
            refresh();
        }
    };

    const handleNuke = () => {
        const prompt = window.prompt("⚠️ PERICOLO ESTREMO ⚠️\nQuesta azione cancellerà TUTTI i dati dell'applicazione, tutti gli utenti e resetterà il sistema allo stato di fabbrica.\n\nScrivi 'RESET' per confermare.");
        if (prompt === 'RESET') {
            nukeSystem();
        }
    };

    const handleClearCache = () => {
        if (confirm("Vuoi svuotare i dati di tutti gli utenti mantenendo gli account?")) {
            clearSystemCache();
            refresh();
            alert("Cache svuotata.");
        }
    };

    const handleSaveConfig = () => {
        const newConfig = {
            ...config,
            globalAnnouncement: announcementInput
        };
        updateGlobalConfig(newConfig);
        setConfig(newConfig);
        refresh(); // To update logs
        alert("Configurazione salvata.");
    };

    const toggleMaintenance = () => {
        const newConfig = { ...config, maintenanceMode: !config.maintenanceMode };
        updateGlobalConfig(newConfig);
        setConfig(newConfig);
        refresh();
    };

    const filteredUsers = users.filter(u => 
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- SUB COMPONENTS ---

    const NavItem = ({ id, label, icon: Icon }: { id: AdminView, label: string, icon: any }) => (
        <button 
            onClick={() => setActiveView(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-mono text-sm ${activeView === id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    const StatCard = ({ label, value, sub, icon: Icon, color }: any) => (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon size={64} />
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-white font-mono">{value}</h3>
            {sub && <p className="text-[10px] text-slate-500 mt-2 font-mono">{sub}</p>}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[200] flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 overflow-hidden animate-in fade-in zoom-in duration-300">
            
            {/* SIDEBAR */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="font-bold text-white text-lg tracking-tight flex items-center gap-2">
                        <Terminal size={20} className="text-emerald-500" />
                        Kairòs<span className="text-slate-600 font-light">Admin</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-mono text-emerald-500 uppercase">System Online</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-colors font-mono text-xs font-bold mb-6"
                        >
                            <ArrowLeft size={16} /> Back to App
                        </button>
                    )}

                    <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 mt-2">Main</p>
                    <NavItem id="overview" label="Overview" icon={LayoutDashboard} />
                    <NavItem id="users" label="User Manager" icon={Users} />
                    <NavItem id="reports" label="Segnalazioni" icon={MessageSquareWarning} />
                    
                    <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 mt-6">System</p>
                    <NavItem id="console" label="System Console" icon={Cpu} />
                    <NavItem id="config" label="Global Config" icon={Globe} />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors font-mono text-xs font-bold"
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto bg-slate-950 p-8">
                
                {/* VIEW: OVERVIEW */}
                {activeView === 'overview' && stats && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                                <p className="text-slate-500 text-sm">Monitoraggio in tempo reale delle risorse locali.</p>
                            </div>
                            <button onClick={refresh} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <RefreshCcw size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Total Users" value={stats.userCount} sub="Active Accounts" icon={Users} color="text-blue-500" />
                            <StatCard label="Items Stored" value={stats.totalTasks + stats.totalEvents} sub="Tasks & Events DB" icon={Database} color="text-purple-500" />
                            <StatCard label="Reports Open" value={reports.length} sub="Issues Pending" icon={MessageSquareWarning} color="text-red-500" />
                            <StatCard label="Transactions" value={stats.totalTransactions} sub="Financial Records" icon={Activity} color="text-orange-500" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                                    <Activity size={16} /> Attività Recente
                                </h3>
                                <div className="space-y-3 font-mono text-xs">
                                    {logs.slice(0, 5).map((log: any) => (
                                        <div key={log.id} className="flex justify-between items-center pb-2 border-b border-slate-800 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${log.level === 'error' ? 'bg-red-500' : log.level === 'warning' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                                <span className="text-slate-300">{log.action}</span>
                                            </div>
                                            <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    ))}
                                    {logs.length === 0 && <p className="text-slate-600 italic">Nessun log disponibile.</p>}
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                                    <Server size={16} /> Stato Sistema
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-mono">Status</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${config.maintenanceMode ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {config.maintenanceMode ? 'MAINTENANCE' : 'OPERATIONAL'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-mono">Version</span>
                                        <span className="text-xs text-white font-mono">2.1.0 (Local)</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-mono">Uptime</span>
                                        <span className="text-xs text-white font-mono">Session Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: REPORTS */}
                {activeView === 'reports' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <MessageSquareWarning size={24} className="text-yellow-500" /> Segnalazioni Utenti
                            </h2>
                            <button onClick={refresh} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><RefreshCcw size={18} /></button>
                        </div>

                        {reports.length === 0 ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                                    <CheckCircle2 size={32} />
                                </div>
                                <p className="text-slate-400 font-bold">Nessuna segnalazione aperta.</p>
                                <p className="text-xs text-slate-600">Ottimo lavoro!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {reports.map((report) => (
                                    <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${report.type === 'bug' ? 'bg-red-500/10 text-red-500' : report.type === 'feature' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-400'}`}>
                                                    {report.type === 'bug' ? <Bug size={20} /> : report.type === 'feature' ? <Lightbulb size={20} /> : <HelpCircle size={20} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">{report.type === 'bug' ? 'Bug Report' : report.type === 'feature' ? 'Feature Request' : 'Feedback'}</h4>
                                                    <p className="text-[10px] text-slate-500">{new Date(report.timestamp).toLocaleString()} da <span className="text-slate-300">{report.userName}</span></p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-950 text-slate-400 border border-slate-800">Open</span>
                                        </div>
                                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 mb-4">
                                            <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">{report.description}</p>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleResolveReport(report.id)}
                                                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Archive size={14} /> Risolvi & Archivia
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* VIEW: USERS */}
                {activeView === 'users' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white">Gestione Utenti</h2>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Cerca utente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors w-64"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Utente</th>
                                        <th className="px-6 py-4">ID Sistema</th>
                                        <th className="px-6 py-4">Dati</th>
                                        <th className="px-6 py-4">Ultimo Accesso</th>
                                        <th className="px-6 py-4 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                                                Nessun utente trovato.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <tr key={u.uid} className="hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                                                            {u.displayName.charAt(0)}
                                                        </div>
                                                        {u.displayName}
                                                        {u.email.includes('admin') && <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded">ADMIN</span>}
                                                    </div>
                                                    <div className="text-slate-500 text-xs pl-8">{u.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <code className="bg-slate-950 px-2 py-1 rounded text-xs text-slate-400 font-mono">
                                                        {u.uid.substring(0, 8)}...
                                                    </code>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-300 font-mono text-xs">{u.dataSizeKB} KB</span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-xs">
                                                    {new Date(u.lastLogin).toLocaleDateString()} {new Date(u.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {!u.email.includes('admin') && (
                                                        <button 
                                                            onClick={() => handleDeleteUser(u.uid, u.displayName)}
                                                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                            title="Elimina Utente"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VIEW: CONSOLE */}
                {activeView === 'console' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Terminal size={24} className="text-slate-400" />
                            System Console & Logs
                        </h2>

                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-y-auto custom-scrollbar shadow-inner">
                            {logs.length === 0 && <span className="text-slate-600">// System logs initialized. Waiting for events...</span>}
                            {logs.map((log: any) => (
                                <div key={log.id} className="mb-2 flex gap-3">
                                    <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className={`font-bold shrink-0 w-24 ${log.level === 'error' ? 'text-red-500' : log.level === 'warning' ? 'text-orange-500' : 'text-emerald-500'}`}>
                                        {log.level.toUpperCase()}
                                    </span>
                                    <span className="text-slate-300 font-bold shrink-0">{log.action}:</span>
                                    <span className="text-slate-400">{log.details}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                                <h3 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2"><Database size={16}/> Gestione Dati</h3>
                                <p className="text-xs text-slate-500 mb-4">Pulisci i dati temporanei di tutti gli utenti senza eliminare gli account.</p>
                                <button onClick={handleClearCache} className="w-full py-2 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold hover:bg-orange-500/20 transition-all">
                                    SVUOTA CACHE
                                </button>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                                <h3 className="text-sm font-bold text-red-500 mb-2 flex items-center gap-2"><ShieldAlert size={16}/> Danger Zone</h3>
                                <p className="text-xs text-slate-500 mb-4">Eliminazione totale di database e utenti. Irreversibile.</p>
                                <button onClick={handleNuke} className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                                    <Lock size={12} /> FACTORY RESET
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: CONFIG */}
                {activeView === 'config' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Settings size={24} className="text-slate-400" />
                            Global Configuration
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Maintenance Mode */}
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <AlertTriangle size={18} className="text-orange-500" />
                                            Modalità Manutenzione
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">Impedisce l'accesso agli utenti non-admin.</p>
                                    </div>
                                    <div 
                                        onClick={toggleMaintenance}
                                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${config.maintenanceMode ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${config.maintenanceMode ? 'translate-x-6' : ''}`}></div>
                                    </div>
                                </div>
                                <div className="text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400">
                                    Current State: <span className={config.maintenanceMode ? "text-orange-500" : "text-emerald-500"}>{config.maintenanceMode ? "ACTIVE" : "INACTIVE"}</span>
                                </div>
                            </div>

                            {/* Global Announcement */}
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                                    <MessageSquare size={18} className="text-blue-500" />
                                    Annuncio Globale
                                </h3>
                                <div className="space-y-3">
                                    <textarea 
                                        value={announcementInput}
                                        onChange={(e) => setAnnouncementInput(e.target.value)}
                                        placeholder="Scrivi un messaggio per tutti gli utenti..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-blue-500/50 min-h-[100px] resize-none font-sans"
                                    />
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] text-slate-500">Visibile nella dashboard utente.</p>
                                        <button 
                                            onClick={handleSaveConfig}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                                        >
                                            Aggiorna
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Feature Flags (Mock) */}
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl lg:col-span-2 opacity-50">
                                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                                    <Bell size={18} className="text-purple-500" />
                                    System Notifications (Mock)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                                        <div className="w-4 h-4 rounded border border-slate-600"></div>
                                        <span className="text-xs text-slate-400">Email Alerts</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                                        <div className="w-4 h-4 rounded border border-slate-600 bg-emerald-500/20 border-emerald-500 flex items-center justify-center"><Check size={10} className="text-emerald-500"/></div>
                                        <span className="text-xs text-slate-400">Local Push</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};
