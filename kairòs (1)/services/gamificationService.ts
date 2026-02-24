
import { Task, FixedEvent, WellnessEntry, Badge, UserStats } from "../types";
import { Zap, Target, Flame, Heart, Dumbbell, BookOpen, Crown, Award } from 'lucide-react';

// Configuration
const XP_PER_TASK = 15;
const XP_PER_WORKOUT = 30;
const XP_PER_WELLNESS = 20;
const XP_PER_STUDY = 25;
const XP_PER_STREAK_DAY = 50;

const LEVELS = [
    { level: 1, xp: 0, title: "Novizio" },
    { level: 2, xp: 200, title: "Apprendista" },
    { level: 3, xp: 500, title: "Esploratore" },
    { level: 4, xp: 1000, title: "Produttivo" },
    { level: 5, xp: 2000, title: "Esperto" },
    { level: 6, xp: 3500, title: "Maestro" },
    { level: 7, xp: 5500, title: "Visionario" },
    { level: 8, xp: 8000, title: "Leggenda" },
    { level: 9, xp: 12000, title: "Divinità" },
    { level: 10, xp: 20000, title: "Kairòs" },
];

export const calculateUserStats = (
    allTasks: Task[],
    allEvents: FixedEvent[],
    wellnessEntries: WellnessEntry[],
    streak: number
): UserStats => {
    
    // 1. Calculate Counts
    const completedTasks = allTasks.filter(t => t.completed).length;
    const workouts = allEvents.filter(e => e.category === 'workout').length;
    const studySessions = allEvents.filter(e => e.category === 'study').length;
    const wellnessLogs = wellnessEntries.length;

    // 2. Calculate XP
    let xp = 0;
    xp += completedTasks * XP_PER_TASK;
    xp += workouts * XP_PER_WORKOUT;
    xp += studySessions * XP_PER_STUDY;
    xp += wellnessLogs * XP_PER_WELLNESS;
    xp += streak * XP_PER_STREAK_DAY;

    // 3. Determine Level
    let currentLevelObj = LEVELS[0];
    let nextLevelObj = LEVELS[1];

    for (let i = 0; i < LEVELS.length; i++) {
        if (xp >= LEVELS[i].xp) {
            currentLevelObj = LEVELS[i];
            nextLevelObj = LEVELS[i + 1] || { level: 99, xp: 999999, title: "Max" };
        }
    }

    return {
        level: currentLevelObj.level,
        currentXP: xp,
        nextLevelXP: nextLevelObj.xp,
        totalTasksCompleted: completedTasks,
        totalWorkouts: workouts,
        totalWellnessLogs: wellnessLogs,
        streakDays: streak
    };
};

export const getBadges = (stats: UserStats): Badge[] => {
    const badges: Badge[] = [
        {
            id: 'first_steps',
            title: 'Primi Passi',
            description: 'Completa 5 attività',
            icon: 'Target',
            color: 'text-emerald-500 bg-emerald-50',
            targetValue: 5,
            currentValue: stats.totalTasksCompleted,
            isUnlocked: stats.totalTasksCompleted >= 5,
            progress: Math.min((stats.totalTasksCompleted / 5) * 100, 100)
        },
        {
            id: 'consistency',
            title: 'Costanza',
            description: 'Raggiungi 3 giorni di streak',
            icon: 'Flame',
            color: 'text-orange-500 bg-orange-50',
            targetValue: 3,
            currentValue: stats.streakDays,
            isUnlocked: stats.streakDays >= 3,
            progress: Math.min((stats.streakDays / 3) * 100, 100)
        },
        {
            id: 'mindful',
            title: 'Zen Master',
            description: 'Compila il diario 7 volte',
            icon: 'Heart',
            color: 'text-rose-500 bg-rose-50',
            targetValue: 7,
            currentValue: stats.totalWellnessLogs,
            isUnlocked: stats.totalWellnessLogs >= 7,
            progress: Math.min((stats.totalWellnessLogs / 7) * 100, 100)
        },
        {
            id: 'iron_body',
            title: 'Corpo d\'Acciaio',
            description: 'Completa 10 allenamenti',
            icon: 'Dumbbell',
            color: 'text-blue-500 bg-blue-50',
            targetValue: 10,
            currentValue: stats.totalWorkouts,
            isUnlocked: stats.totalWorkouts >= 10,
            progress: Math.min((stats.totalWorkouts / 10) * 100, 100)
        },
        {
            id: 'scholar',
            title: 'Erudito',
            description: 'Raggiungi il livello 5',
            icon: 'BookOpen',
            color: 'text-violet-500 bg-violet-50',
            targetValue: 5,
            currentValue: stats.level,
            isUnlocked: stats.level >= 5,
            progress: Math.min((stats.level / 5) * 100, 100)
        },
        {
            id: 'productive_beast',
            title: 'Macchina da Guerra',
            description: 'Completa 50 attività',
            icon: 'Zap',
            color: 'text-yellow-500 bg-yellow-50',
            targetValue: 50,
            currentValue: stats.totalTasksCompleted,
            isUnlocked: stats.totalTasksCompleted >= 50,
            progress: Math.min((stats.totalTasksCompleted / 50) * 100, 100)
        }
    ];
    return badges;
};

export const getLevelTitle = (level: number) => {
    return LEVELS.find(l => l.level === level)?.title || "Viaggiatore";
};
