import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";

/**
 * Computes streak data for a single user's chronologically-sorted bets.
 * Returns: { bestWinStreak, bestLoseStreak, currentStreak: { type, count } }
 */
function computeStreaks(sortedBets) {
    let bestWinStreak = 0;
    let bestLoseStreak = 0;
    let currentType = null;   // "won" | "lost"
    let currentCount = 0;
    let tempWin = 0;
    let tempLose = 0;

    for (const bet of sortedBets) {
        const r = bet.result;
        if (r !== "won" && r !== "lost") continue;

        if (r === currentType) {
            currentCount++;
        } else {
            currentType = r;
            currentCount = 1;
        }

        if (r === "won") {
            tempWin = Math.max(tempWin, currentCount);
        } else {
            tempLose = Math.max(tempLose, currentCount);
        }
    }

    bestWinStreak = tempWin;
    bestLoseStreak = tempLose;

    return {
        bestWinStreak,
        bestLoseStreak,
        currentStreak: {
            type: currentType,   // last settled direction
            count: currentCount,
        },
    };
}

export default function AdminStreaks() {
    const [users, setUsers] = useState([]);
    const [bets, setBets] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("bestWin"); // bestWin | bestLose | current

    // Fetch all users
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch all settled bets (won / lost only – skip pending & refunded)
    useEffect(() => {
        const q = query(
            collection(db, "bets"),
            where("result", "in", ["won", "lost"])
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setBets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // Fetch matches for chronological ordering
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "matches"), (snapshot) => {
            setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // Build a map of matchId → matchStartTime (ms) for sorting bets chronologically
    const matchTimeMap = useMemo(() => {
        const map = {};
        matches.forEach(m => {
            const ts = m.matchStartTime?.toDate?.() || m.matchStartTime;
            map[m.id] = ts instanceof Date ? ts.getTime() : 0;
        });
        return map;
    }, [matches]);

    // Compute per-user streak data
    const streakData = useMemo(() => {
        // Group bets by userId
        const byUser = {};
        bets.forEach(bet => {
            if (!byUser[bet.userId]) byUser[bet.userId] = [];
            byUser[bet.userId].push(bet);
        });

        // For each user, sort bets by match time then by bet creation time, then compute streaks
        return users.map(u => {
            const userBets = (byUser[u.id] || []).sort((a, b) => {
                const mA = matchTimeMap[a.matchId] || 0;
                const mB = matchTimeMap[b.matchId] || 0;
                if (mA !== mB) return mA - mB;
                // Fallback: createdAt
                const tA = a.createdAt?.toDate?.()?.getTime?.() || 0;
                const tB = b.createdAt?.toDate?.()?.getTime?.() || 0;
                return tA - tB;
            });

            const streaks = computeStreaks(userBets);
            const totalBets = userBets.length;
            const wins = userBets.filter(b => b.result === "won").length;

            return {
                id: u.id,
                displayName: u.displayName || "Unknown",
                photoURL: u.photoURL,
                points: u.points || 0,
                totalBets,
                wins,
                losses: totalBets - wins,
                ...streaks,
            };
        }).filter(u => u.totalBets > 0);  // Only users who have placed settled bets
    }, [users, bets, matchTimeMap]);

    // Sort the streak data based on active sort
    const sortedStreakData = useMemo(() => {
        const data = [...streakData];
        switch (sortBy) {
            case "bestWin":
                data.sort((a, b) => b.bestWinStreak - a.bestWinStreak || b.currentStreak.count - a.currentStreak.count);
                break;
            case "bestLose":
                data.sort((a, b) => b.bestLoseStreak - a.bestLoseStreak || b.currentStreak.count - a.currentStreak.count);
                break;
            case "current":
                data.sort((a, b) => b.currentStreak.count - a.currentStreak.count || b.bestWinStreak - a.bestWinStreak);
                break;
            default:
                break;
        }
        return data;
    }, [streakData, sortBy]);

    const renderAvatar = (userData, size = "size-10") => {
        if (userData.photoURL) {
            return (
                <img
                    className={`${size} rounded-full object-cover border border-slate-200 dark:border-primary/20 shadow-sm`}
                    alt={userData.displayName}
                    src={userData.photoURL}
                    referrerPolicy="no-referrer"
                />
            );
        }
        const initials = (userData.displayName || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        return (
            <div className={`${size} rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold text-xs border border-slate-300 dark:border-slate-700`}>
                {initials}
            </div>
        );
    };

    /**
     * Returns a coloured badge for the streak type.
     */
    const renderStreakBadge = (type, count) => {
        if (!type || count === 0) {
            return (
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-1 rounded-full font-bold">
                    — None
                </span>
            );
        }
        const isWin = type === "won";
        return (
            <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tight ${
                isWin
                    ? "bg-green-500/10 text-green-600 border border-green-500/20"
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
            }`}>
                <span className="material-symbols-outlined text-[12px]">
                    {isWin ? "trending_up" : "trending_down"}
                </span>
                {count} {isWin ? "Win" : "Loss"}
            </span>
        );
    };

    const sortOptions = [
        { id: "bestWin", label: "Best Win Streak", icon: "emoji_events" },
        { id: "bestLose", label: "Best Lose Streak", icon: "heart_broken" },
        { id: "current", label: "Current Streak", icon: "local_fire_department" },
    ];

    if (loading) {
        return (
            <div className="flex flex-col w-full h-full items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Sort Selector */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-primary/10 overflow-x-auto no-scrollbar">
                {sortOptions.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl transition-all duration-300 whitespace-nowrap ${
                            sortBy === opt.id
                                ? "bg-white dark:bg-primary/20 text-primary shadow-sm scale-100"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 scale-95"
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px] font-bold">{opt.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-tight">{opt.label}</span>
                    </button>
                ))}
            </div>

            {/* Streak Cards */}
            <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-primary/10 bg-slate-50/50 dark:bg-primary/5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                Win/Loss Streaks
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Best &amp; current streaks for all users
                            </p>
                        </div>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">
                            {sortedStreakData.length} Users
                        </span>
                    </div>
                </div>

                {/* User List */}
                <div className="divide-y divide-slate-100 dark:divide-primary/10">
                    {sortedStreakData.map((stat, index) => (
                        <div key={stat.id} className="p-4 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                            {/* Top Row: User Info + Current Streak */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        {renderAvatar(stat)}
                                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full size-4 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                            <span className="text-[8px] font-bold text-slate-500">{index + 1}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate w-32">
                                            {stat.displayName}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            {stat.wins}W - {stat.losses}L · {stat.totalBets} Bets
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Current</p>
                                    {renderStreakBadge(stat.currentStreak.type, stat.currentStreak.count)}
                                </div>
                            </div>

                            {/* Bottom Row: Best Streaks */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* Best Win Streak */}
                                <div className="bg-green-500/5 dark:bg-green-500/10 rounded-xl p-3 border border-green-500/10 transition-transform active:scale-95">
                                    <div className="flex items-center gap-1.5 mb-1.5 opacity-70">
                                        <span className="material-symbols-outlined text-[14px] text-green-600">emoji_events</span>
                                        <span className="text-[8px] font-bold uppercase text-green-700 dark:text-green-500 tracking-widest">Best Win Streak</span>
                                    </div>
                                    <div className="flex items-end gap-1">
                                        <p className="text-2xl font-black text-green-600 leading-none">{stat.bestWinStreak}</p>
                                        <p className="text-[9px] text-green-500/70 font-bold mb-0.5">consecutive</p>
                                    </div>
                                    {/* Visual streak indicator */}
                                    {stat.bestWinStreak > 0 && (
                                        <div className="flex gap-0.5 mt-2">
                                            {Array.from({ length: Math.min(stat.bestWinStreak, 10) }).map((_, i) => (
                                                <div key={i} className="h-1.5 flex-1 rounded-full bg-green-500/40" style={{ opacity: 0.4 + (i / Math.min(stat.bestWinStreak, 10)) * 0.6 }} />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Best Lose Streak */}
                                <div className="bg-red-500/5 dark:bg-red-500/10 rounded-xl p-3 border border-red-500/10 transition-transform active:scale-95">
                                    <div className="flex items-center gap-1.5 mb-1.5 opacity-70">
                                        <span className="material-symbols-outlined text-[14px] text-red-600">heart_broken</span>
                                        <span className="text-[8px] font-bold uppercase text-red-700 dark:text-red-500 tracking-widest">Best Lose Streak</span>
                                    </div>
                                    <div className="flex items-end gap-1">
                                        <p className="text-2xl font-black text-red-500 leading-none">{stat.bestLoseStreak}</p>
                                        <p className="text-[9px] text-red-500/70 font-bold mb-0.5">consecutive</p>
                                    </div>
                                    {/* Visual streak indicator */}
                                    {stat.bestLoseStreak > 0 && (
                                        <div className="flex gap-0.5 mt-2">
                                            {Array.from({ length: Math.min(stat.bestLoseStreak, 10) }).map((_, i) => (
                                                <div key={i} className="h-1.5 flex-1 rounded-full bg-red-500/40" style={{ opacity: 0.4 + (i / Math.min(stat.bestLoseStreak, 10)) * 0.6 }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="p-8 text-center opacity-30">
                <span className="material-symbols-outlined text-4xl mb-2">local_fire_department</span>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">End of Streak Data</p>
            </div>
        </div>
    );
}
