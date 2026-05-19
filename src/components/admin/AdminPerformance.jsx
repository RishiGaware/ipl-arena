import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";

import { db } from "../../firebase";

export default function AdminPerformance() {
    const [users, setUsers] = useState([]);
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch all users
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch all settled bets
    useEffect(() => {
        const q = query(
            collection(db, "bets"),
            where("result", "in", ["won", "lost", "refunded"])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const betsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBets(betsData);
        });

        return () => unsubscribe();
    }, []);

    const userStats = useMemo(() => {
        const stats = {};

        // Initialize stats for all users
        users.forEach(u => {
            stats[u.id] = {
                id: u.id,
                displayName: u.displayName || "Unknown",
                photoURL: u.photoURL,
                points: u.points || 0,
                wins: 0,
                losses: 0,
                refunds: 0,
                totalProfit: 0,
                winPoints: 0,
                losePoints: 0,
                totalBets: 0
            };
        });

        // Aggregate bets
        bets.forEach(bet => {
            if (!stats[bet.userId]) return;

            const s = stats[bet.userId];
            s.totalBets++;

            if (bet.result === "won") {
                s.wins++;
                const profit = (bet.netProfit || 0);
                s.totalProfit += profit;
                s.winPoints += profit;
            } else if (bet.result === "lost") {
                s.losses++;
                const loss = (bet.netLoss || 0);
                s.totalProfit -= loss;
                s.losePoints += loss;
            } else if (bet.result === "refunded") {
                s.refunds++;
            }
        });

        return Object.values(stats).sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
    }, [users, bets]);

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

    if (loading) {
        return (
            <div className="flex flex-col w-full h-full items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                {/* Header Summary */}
                <div className="p-4 border-b border-slate-100 dark:border-primary/10 bg-slate-50/50 dark:bg-primary/5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">User Performance</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">Win/Loss stats for all users</p>
                        </div>
                        <span className="text-[10px] bg-primary/10 text-white px-2 py-1 rounded-full font-bold">
                            {users.length} Users
                        </span>
                    </div>
                </div>

                {/* Table View */}
                <div className="divide-y divide-slate-100 dark:divide-primary/10">
                    {userStats.map((stat, index) => (
                        <div key={stat.id} className="p-4 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
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
                                            Balance: <span className="font-bold text-slate-700 dark:text-slate-300">{stat.points.toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xs font-black ${stat.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {stat.totalProfit >= 0 ? '+' : ''}{stat.totalProfit.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Profit/Loss</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="bg-green-500/5 dark:bg-green-500/10 rounded-lg py-2 border border-green-500/10 transition-transform active:scale-95">
                                    <p className="text-sm font-black text-green-500">{stat.wins}</p>
                                    <p className="text-[8px] text-green-600/70 font-bold uppercase tracking-widest">Wins</p>
                                    <p className="text-[9px] text-green-500 font-bold mt-0.5">+{stat.winPoints.toLocaleString()}</p>
                                </div>
                                <div className="bg-red-500/5 dark:bg-red-500/10 rounded-lg py-2 border border-red-500/10 transition-transform active:scale-95">
                                    <p className="text-sm font-black text-red-500">{stat.losses}</p>
                                    <p className="text-[8px] text-red-600/70 font-bold uppercase tracking-widest">Loses</p>
                                    <p className="text-[9px] text-red-500 font-bold mt-0.5">-{stat.losePoints.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-500/5 dark:bg-slate-500/10 rounded-lg py-2 border border-slate-500/10 transition-transform active:scale-95">
                                    <p className="text-sm font-black text-slate-500">{stat.refunds}</p>
                                    <p className="text-[8px] text-slate-500/70 font-bold uppercase tracking-widest">Refunds</p>
                                </div>
                                <div className="bg-primary/5 dark:bg-primary/10 rounded-lg py-2 border border-primary/10 transition-transform active:scale-95">
                                    <p className="text-sm font-black text-white">
                                        {stat.totalBets > 0 ? Math.round((stat.wins / (stat.totalBets - stat.refunds || 1)) * 100) : 0}%
                                    </p>
                                    <p className="text-[8px] text-white font-bold uppercase tracking-widest">Win Rate</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visualizer Footer */}
            <div className="p-8 text-center opacity-30">
                <span className="material-symbols-outlined text-4xl mb-2">monitoring</span>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">End of statistics</p>
            </div>
        </div>
    );
}
