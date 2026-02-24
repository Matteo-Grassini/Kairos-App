
import React, { useMemo, useState, useEffect } from 'react';
import { User, Mail, Bell, Shield, Moon, Volume2, Download, LogOut, ChevronRight, HelpCircle, FileText, Smartphone, HardDrive, Sparkles, Palette, Edit3, Check, Trophy, Lock, Flame, Target, Heart, Dumbbell, BookOpen, Zap, Key, Users, MessageSquareWarning, X, Send, SmartphoneNfc, AppWindow, Wifi, WifiOff, CloudCog, Loader2, Crown, CreditCard, Star, Globe, Type, Clock, Fingerprint, Eye, History, Save, Database, ShieldCheck, Calendar, Terminal, UploadCloud, Plus, Cloud, RefreshCw } from 'lucide-react';
import { calculateUserStats, getBadges, getLevelTitle } from '../services/gamificationService';
import { DEV_API_KEY } from '../services/geminiService';
import { UserManagementModal } from './UserManagementModal';
import { SubscriptionModal } from './SubscriptionModal';
import { AdminDashboard } from './AdminDashboard';
import { submitReport, updateUserSecurity, isCloudEnabled, checkCloudSyncStatus } from '../services/firebase';
import { AppSettings, AuditLogEntry } from '../types';

interface ProfileSectionProps {
  user: any;
  onLogout: () => void;
  // Settings
  darkMode: boolean;
  toggleDarkMode: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  // Personalization
  accentColor: string;
  setAccentColor: (color: string) => void;
  customName: string;
  setCustomName: (name: string) => void;
  // Data for Gamification
  tasks?: any[];
  events?: any[];
  wellnessEntries?: any[];
  streak?: number;
  // Premium
  isPremium: boolean;
  onUpgradeToPremium: () => void;
  // NEW: App Settings
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => void;
  onUpdateUser?: (updates: any) => void; 
  // Creator Tools
  isAdmin?: boolean;
  onTogglePremiumManual?: () => void;
}

const IconMap: any = {
    Target, Flame, Heart, Dumbbell, BookOpen, Zap
};

// --- CONFIGURAZIONE EMAIL ADMIN ---
const ADMIN_EMAIL = "kairos.app.contact@gmail.com"; 

export const ProfileSection: React.FC<ProfileSectionProps> = ({ 
    user, onLogout, 
    darkMode, toggleDarkMode,
    soundEnabled, toggleSound,
    notificationsEnabled, toggleNotifications,
    accentColor, setAccentColor,
    customName, setCustomName,
    tasks = [], events = [], wellnessEntries = [], streak = 0,
    isPremium, onUpgradeToPremium,
    settings, updateSettings,
    onUpdateUser,
    isAdmin, onTogglePremiumManual
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'security'>('general');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(customName || user.displayName || 'Utente');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  
  // Settings UI States
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  
  // Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'bug' | 'feature' | 'other'>('bug');
  const [reportDesc, setReportDesc] = useState('');
  
  // Security State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.twoFactorEnabled || false);
  const [pinCode, setPinCode] = useState('');
  const [hasPin, setHasPin] = useState(user.hasPin || !!user.pin || false);
  
  // Cloud Verify State
  const [verifyingCloud, setVerifyingCloud] = useState(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState('');
  
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const hasIntegratedKey = !!DEV_API_KEY && DEV_API_KEY.length > 0;

  const isLocalAccount = user.uid.startsWith('local_');

  // Sync state with user prop
  useEffect(() => {
      setTwoFactorEnabled(user.twoFactorEnabled || false);
      setHasPin(user.hasPin || !!user.pin || false);
  }, [user]);

  useEffect(() => {
      const key = localStorage.getItem('gemini_api_key');
      if (key) {
          setApiKey(key);
      }

      // Check Cloud Status on Mount
      if (isCloudEnabled && !isLocalAccount) {
          checkCloudSyncStatus(user.uid).then(status => {
              setCloudStatusMsg(status.includes('✅') ? 'Sincronizzato' : 'In attesa');
          });
      } else {
          setCloudStatusMsg('Locale');
      }

      // Check if already installed
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(isStandaloneMode);

      // Check for PWA install support
      const handler = (e: any) => {
          e.preventDefault();
          setInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);

      // Check if iOS
      const isDeviceIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(isDeviceIOS);

      // DETECT REAL DEVICE
      const getDeviceName = () => {
          const ua = navigator.userAgent;
          if (ua.match(/Android/i)) return "Android Device";
          if (ua.match(/iPhone|iPad|iPod/i)) return "iOS Device";
          if (ua.match(/Mac/i)) return "Mac Desktop";
          if (ua.match(/Win/i)) return "Windows PC";
          if (ua.match(/Linux/i)) return "Linux System";
          return "Web Browser";
      };

      const currentDevice = getDeviceName();

      // Dynamic Logs based on actual session
      const logs: AuditLogEntry[] = [
          { id: '1', action: 'Sessione Attiva', timestamp: new Date().toISOString(), device: currentDevice, status: 'success' },
      ];
      
      // Add a fake "Login" from slightly earlier just to show history
      logs.push({ 
          id: '2', 
          action: 'Login Effettuato', 
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          device: currentDevice, 
          status: 'success' 
      });

      setAuditLogs(logs);

      return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [user.uid]);

  const handleInstallClick = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
          setInstallPrompt(null);
      }
  };

  const handleSaveKey = () => {
      localStorage.setItem('gemini_api_key', apiKey);
      setIsEditingKey(false);
      alert("Chiave API salvata!");
  };

  const handleVerifyCloud = async () => {
      setVerifyingCloud(true);
      const status = await checkCloudSyncStatus(user.uid);
      setCloudStatusMsg(status.includes('✅') ? 'Sincronizzato' : 'Errore');
      setVerifyingCloud(false);
      // alert(status); // Removed alert to be less intrusive
  };

  const handleReportSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!reportDesc.trim()) return;
      submitReport(user.uid, customName || user.displayName || 'User', reportType, reportDesc);
      const subject = encodeURIComponent(`Kairòs Report: ${reportType.toUpperCase()}`);
      const emailBody = `Ciao Admin,\n\nUTENTE: ${customName} (${user.uid})\n\n${reportDesc}`;
      const body = encodeURIComponent(emailBody);
      window.open(`mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`);
      setReportDesc('');
      setIsReportModalOpen(false);
      alert("Segnalazione salvata!");
  };

  const handleToggle2FA = () => {
      const newValue = !twoFactorEnabled;
      setTwoFactorEnabled(newValue);
      updateUserSecurity(user.uid, { twoFactorEnabled: newValue });
      
      // Update global user state immediately
      if (onUpdateUser) {
          onUpdateUser({ twoFactorEnabled: newValue });
      }
      
      if (newValue) {
          alert("2FA Attivata! Al prossimo login ti verrà richiesto un codice.");
      }
  };

  const handleSetPin = () => {
      if (pinCode.length !== 4) {
          alert("Il PIN deve essere di 4 cifre.");
          return;
      }
      updateUserSecurity(user.uid, { pin: pinCode });
      setHasPin(true);
      
      // Update global user state immediately
      if (onUpdateUser) {
          onUpdateUser({ pin: pinCode, hasPin: true });
      }

      setPinCode('');
      alert("PIN di sicurezza impostato. Sarà richiesto al blocco schermo.");
  };

  const handleRemovePin = () => {
      if(confirm("Rimuovere il PIN?")) {
          updateUserSecurity(user.uid, { pin: null });
          setHasPin(false);
          
          if (onUpdateUser) {
              onUpdateUser({ pin: null, hasPin: false });
          }
      }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
      updateSettings({ ...settings, [key]: value });
  };

  const toggleSubNotification = (key: keyof AppSettings['notifications']) => {
      updateSettings({
          ...settings,
          notifications: {
              ...settings.notifications,
              [key]: !settings.notifications[key]
          }
      });
  };

  // GAMIFICATION STATS
  const stats = useMemo(() => calculateUserStats(tasks, events, wellnessEntries, streak), [tasks, events, wellnessEntries, streak]);
  const badges = useMemo(() => getBadges(stats), [stats]);
  const levelTitle = getLevelTitle(stats.level);
  const visualXpPercent = Math.min((stats.currentXP / stats.nextLevelXP) * 100, 100);

  const handleExportData = () => {
      const dataStr = localStorage.getItem('agenda_smart_data');
      if (!dataStr) {
          alert("Nessun dato da esportare.");
          return;
      }
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', 'agenda_backup.json');
      linkElement.click();
  };

  const handleSaveName = () => {
      setCustomName(tempName);
      setIsEditingName(false);
  };

  const handleSetColor = (colorId: string, isPremiumColor: boolean) => {
      if (isPremiumColor && !isPremium) {
          setIsSubModalOpen(true);
          return;
      }
      setAccentColor(colorId);
  };

  const colors = [
      { id: 'indigo', hex: 'bg-indigo-500', ring: 'ring-indigo-500', premium: false },
      { id: 'violet', hex: 'bg-violet-500', ring: 'ring-violet-500', premium: false },
      { id: 'rose', hex: 'bg-rose-500', ring: 'ring-rose-500', premium: false },
      { id: 'orange', hex: 'bg-orange-500', ring: 'ring-orange-500', premium: false },
      { id: 'emerald', hex: 'bg-emerald-500', ring: 'ring-emerald-500', premium: false },
      { id: 'cyan', hex: 'bg-cyan-500', ring: 'ring-cyan-500', premium: false },
      { id: 'slate', hex: 'bg-slate-600', ring: 'ring-slate-600', premium: false },
      { id: 'amber', hex: 'bg-amber-400', ring: 'ring-amber-400', premium: true, name: 'Gold' },
      { id: 'zinc', hex: 'bg-zinc-300', ring: 'ring-zinc-300', premium: true, name: 'Platinum' },
  ];

  const SettingRow = ({ icon: Icon, title, subtitle, onClick, isToggle, toggled, destructive, valueDisplay }: any) => {
      // Dynamic color class workaround for toggles
      const activeColor = accentColor === 'indigo' ? 'bg-indigo-500' :
                          accentColor === 'violet' ? 'bg-violet-500' :
                          accentColor === 'rose' ? 'bg-rose-500' :
                          accentColor === 'orange' ? 'bg-orange-500' :
                          accentColor === 'emerald' ? 'bg-emerald-500' :
                          accentColor === 'cyan' ? 'bg-cyan-500' :
                          accentColor === 'slate' ? 'bg-slate-600' :
                          accentColor === 'amber' ? 'bg-amber-400' : 'bg-zinc-400';

      return (
      <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all group ${onClick ? 'cursor-pointer hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm active:scale-[0.99]' : ''}`}
      >
          <div className="flex items-center gap-4 text-left">
              <div className={`p-2.5 rounded-xl transition-colors ${destructive ? 'bg-red-50 text-red-500 dark:bg-red-900/30' : 'bg-slate-50 text-slate-500 dark:bg-slate-700 dark:text-slate-300 group-hover:bg-opacity-80'}`}>
                  <Icon size={20} />
              </div>
              <div>
                  <h4 className={`font-bold text-sm ${destructive ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>{title}</h4>
                  {subtitle && <p className={`text-xs font-medium ${destructive ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>{subtitle}</p>}
              </div>
          </div>
          
          <div className="flex items-center gap-3 text-slate-300 dark:text-slate-600 group-hover:opacity-80">
             {valueDisplay && <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md">{valueDisplay}</span>}
             {isToggle ? (
                 <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${toggled ? activeColor : 'bg-slate-200 dark:bg-slate-600'}`}>
                     <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${toggled ? 'translate-x-5' : ''}`}></div>
                 </div>
             ) : (
                 !destructive && <ChevronRight size={18} />
             )}
          </div>
      </button>
  )};

  if (showAdminDashboard && isAdmin) {
      return <AdminDashboard user={user} onLogout={onLogout} onBack={() => setShowAdminDashboard(false)} />;
  }

  return (
    <div className={`flex flex-col h-full bg-[#F5F5F7] dark:bg-slate-900 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0 scroll-smooth transition-colors duration-300 ${settings.fontSize === 'small' ? 'text-sm' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
        
        <UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} currentUserUid={user.uid} />
        <SubscriptionModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} onUpgrade={() => { onUpgradeToPremium(); setIsSubModalOpen(false); }} user={user} />

        {/* HEADER AREA */}
        <div className="bg-white dark:bg-slate-800 p-6 lg:p-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 dark:border-slate-700 z-10 relative overflow-hidden shrink-0 transition-colors duration-300">
             <div className={`absolute top-0 right-0 w-64 h-64 bg-${accentColor}-50 dark:bg-slate-800/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none transition-colors duration-500`}></div>

             {/* CLOUD SYNC STATUS BADGE */}
             <div className="absolute top-6 right-6 z-20">
                 <button 
                    onClick={handleVerifyCloud}
                    disabled={verifyingCloud}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        cloudStatusMsg === 'Sincronizzato' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        cloudStatusMsg === 'In attesa' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        cloudStatusMsg === 'Locale' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                 >
                     {verifyingCloud ? (
                         <Loader2 size={12} className="animate-spin" />
                     ) : (
                         <Cloud size={12} fill={cloudStatusMsg === 'Sincronizzato' ? "currentColor" : "none"} />
                     )}
                     {verifyingCloud ? 'Checking...' : cloudStatusMsg || 'Cloud'}
                 </button>
             </div>

             <div className="relative z-10 flex flex-col items-center text-center mt-2">
                <div className={`w-24 h-24 rounded-full p-1 bg-white dark:bg-slate-700 border-2 ${isPremium ? 'border-yellow-400' : `border-${accentColor}-100 dark:border-slate-600`} shadow-xl mb-4 relative group transition-colors duration-300`}>
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-300">
                            <User size={40} />
                        </div>
                    )}
                    <button 
                        onClick={() => setIsEditingName(true)}
                        className={`absolute bottom-0 right-0 bg-${accentColor}-500 text-white p-1.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm hover:scale-110 transition-transform`}
                    >
                        <Edit3 size={12} fill="currentColor" />
                    </button>
                </div>
                
                {isEditingName ? (
                    <div className="flex items-center gap-2 mb-2 animate-in fade-in zoom-in">
                        <input 
                            type="text" 
                            value={tempName} 
                            onChange={(e) => setTempName(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1 text-lg font-bold text-slate-900 dark:text-white outline-none w-40 text-center"
                            autoFocus
                        />
                        <button onClick={handleSaveName} className={`p-1.5 bg-${accentColor}-500 text-white rounded-lg hover:opacity-90`}>
                            <Check size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 justify-center">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{customName || user.displayName || 'Ospite'}</h2>
                        {isPremium && <span className="bg-yellow-400 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">PRO</span>}
                    </div>
                )}
                
                <div className="mt-2 flex flex-col items-center gap-2 w-full max-w-xs">
                    <span className={`text-xs font-bold uppercase tracking-widest text-${accentColor}-600 dark:text-${accentColor}-400 bg-${accentColor}-50 dark:bg-${accentColor}-900/20 px-3 py-1 rounded-full`}>
                        Livello {stats.level} • {levelTitle}
                    </span>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1 relative">
                        <div className={`h-full bg-${accentColor}-500 transition-all duration-1000 ease-out`} style={{ width: `${visualXpPercent}%` }}></div>
                    </div>
                </div>
             </div>

             {/* TABS */}
             <div className="flex justify-center gap-2 mt-8 flex-wrap">
                 {[{id: 'general', label: 'Generale', icon: User}, {id: 'appearance', label: 'Aspetto', icon: Palette}, {id: 'security', label: 'Sicurezza', icon: ShieldCheck}].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? `bg-${accentColor}-50 text-${accentColor}-600 dark:bg-slate-700 dark:text-white` : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                     >
                         <tab.icon size={14} /> {tab.label}
                     </button>
                 ))}
             </div>
        </div>

        {/* SETTINGS CONTENT */}
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            
            {/* --- GENERAL TAB --- */}
            {activeTab === 'general' && (
                <>
                    {/* INSTALL APP BANNER */}
                    {installPrompt && !isStandalone && (
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 rounded-2xl text-white shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-base">Installa Kairòs</h4>
                                    <p className="text-xs opacity-90 text-indigo-100">Per un'esperienza a schermo intero</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleInstallClick} 
                                className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-50 transition-all active:scale-95"
                            >
                                Installa
                            </button>
                        </div>
                    )}

                    {/* IOS INSTALL HINT */}
                    {isIOS && !isStandalone && (
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Per installare su iPhone: tocca <span className="font-bold">Condividi</span> <UploadCloud className="inline w-4 h-4 mx-1"/> e poi <span className="font-bold">Aggiungi alla schermata Home</span> <Plus className="inline w-4 h-4" />
                            </p>
                        </div>
                    )}

                    {/* SUBSCRIPTION & MODES CARD */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${isPremium ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {isPremium ? <Crown size={20} /> : <User size={20} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">Piano Attuale</h4>
                                    <p className="text-xs text-slate-500">{isPremium ? (isAdmin ? 'God Mode (Admin)' : 'Kairòs Pro') : 'Starter Free'}</p>
                                </div>
                            </div>
                            {!isPremium && (
                                <button onClick={onUpgradeToPremium} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all">
                                    Upgrade
                                </button>
                            )}
                        </div>
                        
                        {isAdmin && (
                            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button 
                                    onClick={() => setShowAdminDashboard(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md shadow-slate-300/50 dark:shadow-none"
                                >
                                    <Users size={14} /> Pannello Admin
                                </button>
                                <button 
                                    onClick={onTogglePremiumManual}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                >
                                    <Zap size={14} /> {isPremium ? 'Switch to Free' : 'Switch to God'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 mb-2">Preferenze Regionali</h3>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <SettingRow 
                                icon={Globe} 
                                title="Lingua" 
                                subtitle={settings.language === 'it' ? 'Italiano' : settings.language === 'en' ? 'English' : 'Español'}
                                valueDisplay={settings.language.toUpperCase()}
                                onClick={() => setIsLanguageSelectorOpen(!isLanguageSelectorOpen)}
                            />
                            {isLanguageSelectorOpen && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex gap-2 animate-in slide-in-from-top-2 border-t border-slate-100 dark:border-slate-700">
                                    {['it', 'en', 'es'].map((lang: any) => (
                                        <button
                                            key={lang}
                                            onClick={() => {
                                                updateSetting('language', lang);
                                                setIsLanguageSelectorOpen(false);
                                            }}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                settings.language === lang 
                                                ? `bg-${accentColor}-500 text-white border-${accentColor}-500` 
                                                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            {lang === 'it' ? 'Italiano' : lang === 'en' ? 'English' : 'Español'}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4"></div>
                            <SettingRow 
                                icon={Clock} 
                                title="Formato Ora" 
                                subtitle={settings.timeFormat === '24h' ? "24 Ore (14:00)" : "12 Ore (2:00 PM)"}
                                valueDisplay={settings.timeFormat}
                                onClick={() => updateSetting('timeFormat', settings.timeFormat === '24h' ? '12h' : '24h')}
                            />
                            <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4"></div>
                            <SettingRow 
                                icon={Calendar} 
                                title="Inizio Settimana" 
                                subtitle={settings.startOfWeek === 'monday' ? "Lunedì" : "Domenica"}
                                valueDisplay={settings.startOfWeek === 'monday' ? "LUN" : "DOM"}
                                onClick={() => updateSetting('startOfWeek', settings.startOfWeek === 'monday' ? 'sunday' : 'monday')}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 mb-2">Notifiche Avanzate</h3>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <SettingRow 
                                icon={Bell} 
                                title="Abilita Notifiche" 
                                subtitle="Attiva/Disattiva tutto"
                                isToggle={true} 
                                toggled={notificationsEnabled}
                                onClick={toggleNotifications}
                            />
                            {notificationsEnabled && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3 animate-in fade-in">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 dark:text-slate-300">Briefing Mattutino</span>
                                        <input type="checkbox" checked={settings.notifications.morningBrief} onChange={() => toggleSubNotification('morningBrief')} className={`accent-${accentColor}-500 w-4 h-4`} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 dark:text-slate-300">Promemoria Task</span>
                                        <input type="checkbox" checked={settings.notifications.reminders} onChange={() => toggleSubNotification('reminders')} className={`accent-${accentColor}-500 w-4 h-4`} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 dark:text-slate-300">Traguardi & Gamification</span>
                                        <input type="checkbox" checked={settings.notifications.achievements} onChange={() => toggleSubNotification('achievements')} className={`accent-${accentColor}-500 w-4 h-4`} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 mb-2">Dati & Backup</h3>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <SettingRow 
                                icon={Database} 
                                title="Backup Automatico" 
                                subtitle="Salva una copia locale ogni settimana"
                                isToggle={true} 
                                toggled={settings.autoBackup}
                                onClick={() => updateSetting('autoBackup', !settings.autoBackup)}
                            />
                            <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4"></div>
                            <SettingRow 
                                icon={Download} 
                                title="Esporta Dati" 
                                subtitle="Scarica file JSON" 
                                onClick={handleExportData}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* --- APPEARANCE TAB --- */}
            {activeTab === 'appearance' && (
                <>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 mb-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Palette size={20} className={`text-${accentColor}-500`} />
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Colore d'Accento</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {colors.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSetColor(c.id, c.premium || false)}
                                    className={`w-10 h-10 rounded-full ${c.hex} transition-all duration-300 flex items-center justify-center relative ${accentColor === c.id ? `ring-4 ring-offset-2 ${c.ring} ring-offset-white dark:ring-offset-slate-800 scale-110` : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                                >
                                    {accentColor === c.id && <Check size={16} className="text-white" strokeWidth={3} />}
                                    {c.premium && !isPremium && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                                            <Lock size={12} className="text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <SettingRow 
                            icon={Moon} 
                            title="Dark Mode" 
                            subtitle="Tema scuro" 
                            onClick={toggleDarkMode}
                            isToggle={true}
                            toggled={darkMode}
                        />
                        <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4"></div>
                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-300">
                                    <Type size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">Dimensione Testo</h4>
                                    <p className="text-xs text-slate-400">Regola la leggibilità</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 rounded-xl p-2">
                                <span className="text-xs font-bold text-slate-400 px-2">Aa</span>
                                <input 
                                    type="range" 
                                    min="0" max="2" 
                                    step="1"
                                    value={settings.fontSize === 'small' ? 0 : settings.fontSize === 'medium' ? 1 : 2}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        updateSetting('fontSize', val === 0 ? 'small' : val === 1 ? 'medium' : 'large');
                                    }}
                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-${accentColor}-500`}
                                />
                                <span className="text-lg font-bold text-slate-600 dark:text-slate-300 px-2">Aa</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* --- SECURITY TAB --- */}
            {activeTab === 'security' && (
                <>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <SettingRow 
                            icon={Lock} 
                            title="Blocco Automatico" 
                            subtitle="Richiedi PIN dopo inattività" 
                            valueDisplay={settings.autoLockMinutes === 0 ? 'Mai' : `${settings.autoLockMinutes}m`}
                            onClick={() => {
                                const options = [0, 1, 5, 15];
                                const currentIdx = options.indexOf(settings.autoLockMinutes);
                                const nextVal = options[(currentIdx + 1) % options.length];
                                updateSetting('autoLockMinutes', nextVal);
                            }}
                        />
                        <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4"></div>
                        <SettingRow 
                            icon={SmartphoneNfc} 
                            title="Autenticazione a 2 Fattori" 
                            subtitle="Codice via app o SMS" 
                            isToggle={true}
                            toggled={twoFactorEnabled}
                            onClick={handleToggle2FA}
                        />
                        <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4"></div>
                        <SettingRow 
                            icon={Fingerprint} 
                            title="Accesso Biometrico" 
                            subtitle="Usa FaceID / TouchID" 
                            isToggle={true}
                            toggled={settings.biometricEnabled}
                            onClick={() => updateSetting('biometricEnabled', !settings.biometricEnabled)}
                        />
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="flex gap-3 items-center mb-4">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                                <Key size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-white">PIN di Sicurezza</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">Proteggi l'accesso</p>
                            </div>
                        </div>
                        
                        {hasPin ? (
                            <div className="flex gap-2">
                                <button disabled className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-emerald-100 dark:border-emerald-800">
                                    <Check size={14} /> PIN Attivo
                                </button>
                                <button onClick={handleRemovePin} className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl hover:bg-red-100 transition-colors">
                                    Rimuovi
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input 
                                    type="password" 
                                    maxLength={4}
                                    placeholder="0000"
                                    value={pinCode}
                                    onChange={(e) => setPinCode(e.target.value)}
                                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold text-center tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button onClick={handleSetPin} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs hover:opacity-90">
                                    Imposta
                                </button>
                            </div>
                        )}
                    </div>

                    {/* AUDIT LOGS */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                <History size={16} className="text-slate-400" /> Registro Attività
                            </h4>
                            <span className="text-[10px] text-slate-400">Ultimi eventi</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {auditLogs.map(log => (
                                <div key={log.id} className="p-3 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 block">{log.action}</span>
                                        <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-slate-500 dark:text-slate-400">{log.device}</span>
                                        <span className={`text-[10px] uppercase font-bold ${log.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{log.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Other Links */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <SettingRow 
                    icon={MessageSquareWarning} 
                    title="Segnala un problema" 
                    subtitle="Bug, errori o suggerimenti"
                    onClick={() => setIsReportModalOpen(true)}
                />
                <SettingRow 
                    icon={LogOut} 
                    title="Disconnettiti" 
                    subtitle="Esci dal tuo account" 
                    onClick={onLogout}
                    destructive={true}
                />
            </div>

        </div>
    </div>
  );
};
