import { collection, onSnapshot, query } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";

import { getTeamLogo, TEAM_NAMES, TEAM_SHORT_NAMES } from "../../constants/teamLogos";
import TeamLogo from "../ui/TeamLogo";
import { db } from "../../firebase";

export default function AdminInsights() {
    const [matches, setMatches] = useState([]);
    const [bets, setBets] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState("records");

    useEffect(() => {
        const unsubscribeMatches = onSnapshot(collection(db, "matches"), (snapshot) => {
            setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubscribeBets = onSnapshot(collection(db, "bets"), (snapshot) => {
            setBets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubscribeMatches();
            unsubscribeBets();
            unsubscribeUsers();
        };
    }, []);

    const topTeamMatchPeaks = useMemo(() => {
        const pairs = {};
        bets.forEach(bet => {
            const key = `${bet.matchId}_${bet.team}`;
            if (!pairs[key]) {
                pairs[key] = { points: 0, count: 0, matchId: bet.matchId, teamId: bet.team };
            }
            pairs[key].points += (bet.points || 0);
            pairs[key].count++;
        });

        return Object.values(pairs)
            .sort((a, b) => b.points - a.points)
            .slice(0, 5)
            .map(peak => {
                const match = matches.find(m => m.id === peak.matchId);
                return {
                    ...peak,
                    teamName: TEAM_SHORT_NAMES[peak.teamId] || TEAM_NAMES[peak.teamId],
                    matchName: match ? `${TEAM_SHORT_NAMES[match.teamA]} vs ${TEAM_SHORT_NAMES[match.teamB]}` : "Unknown Match",
                    venue: match?.venue
                };
            });
    }, [matches, bets]);

    const jackpotWins = useMemo(() => {
        return bets
            .filter(b => b.result === "won")
            .sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0))
            .slice(0, 10)
            .map(win => {
                const user = users.find(u => u.id === win.userId);
                const match = matches.find(m => m.id === win.matchId);
                return {
                    ...win,
                    userName: user?.displayName || "Unknown User",
                    userPhoto: user?.photoURL,
                    matchName: match ? `${TEAM_SHORT_NAMES[match.teamA]} vs ${TEAM_SHORT_NAMES[match.teamB]}` : "Some Match"
                };
            });
    }, [bets, users, matches]);

    const rivalryStrength = useMemo(() => {
        const rivalries = {}; // key: sorted_teamA_teamB
        bets.forEach(bet => {
            const match = matches.find(m => m.id === bet.matchId);
            if (!match) return;

            const sortedTeams = [match.teamA.toString(), match.teamB.toString()].sort();
            const key = sortedTeams.join("_vs_");

            if (!rivalries[key]) {
                rivalries[key] = {
                    teamA: sortedTeams[0],
                    teamB: sortedTeams[1],
                    points: 0,
                    matchCount: new Set()
                };
            }
            rivalries[key].points += (bet.points || 0);
            rivalries[key].matchCount.add(bet.matchId);
        });

        return Object.values(rivalries)
            .sort((a, b) => b.points - a.points)
            .slice(0, 5)
            .map(r => ({
                ...r,
                matchCount: r.matchCount.size,
                name: `${TEAM_SHORT_NAMES[r.teamA]} vs ${TEAM_SHORT_NAMES[r.teamB]}`
            }));
    }, [bets, matches]);

    const teamDetailedStats = useMemo(() => {
        const stats = {};
        Object.keys(TEAM_NAMES).forEach(id => {
            stats[id] = {
                id,
                name: TEAM_SHORT_NAMES[id] || TEAM_NAMES[id],
                fullName: TEAM_NAMES[id],
                totalPoints: 0,
                totalWin: 0,
                totalLoss: 0,
                betCount: 0,
                maxWinInMatch: 0,
                maxLossInMatch: 0,
                matchData: {}
            };
        });

        bets.forEach(bet => {
            const t = stats[bet.team.toString()];
            if (!t) return;
            t.betCount++;
            if (!t.matchData[bet.matchId]) t.matchData[bet.matchId] = { win: 0, loss: 0 };
            if (bet.result === "won") {
                const winAmount = (bet.winnings || (bet.points + (bet.netProfit || 0)));
                t.totalWin += winAmount;
                t.matchData[bet.matchId].win += winAmount;
            } else if (bet.result === "lost") {
                const lossAmount = (bet.points || 0);
                t.totalLoss += lossAmount;
                t.matchData[bet.matchId].loss += lossAmount;
            }
        });

        return Object.values(stats).map(t => {
            const matchSums = Object.values(t.matchData);
            t.maxWinInMatch = matchSums.length > 0 ? Math.max(...matchSums.map(m => m.win)) : 0;
            t.maxLossInMatch = matchSums.length > 0 ? Math.max(...matchSums.map(m => m.loss)) : 0;
            t.totalPoints = t.totalWin + t.totalLoss;
            return t;
        }).sort((a, b) => b.totalPoints - a.totalPoints);
    }, [bets]);

    const subTabs = [
        { id: "records", label: "Records", icon: "offline_bolt" },
        { id: "jackpots", label: "Jackpots", icon: "emoji_events" },
        { id: "rivals", label: "Rivals", icon: "swords" },
        { id: "teams", label: "Teams", icon: "groups" },
    ];

    if (loading) {
        return (
            <div className="flex flex-col w-full h-full items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 pb-10 h-full flex flex-col">
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-primary/10 overflow-x-auto no-scrollbar">
                {subTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl transition-all duration-300 whitespace-nowrap ${subTab === tab.id
                            ? "bg-white dark:bg-primary/20 text-primary shadow-sm scale-100"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 scale-95"
                            }`}
                    >
                        <span className="material-symbols-outlined text-[16px] font-bold">{tab.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-tight">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                {subTab === "records" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-orange-500 text-xl font-black">local_fire_department</span>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Top 5 Records Stakes</h3>
                        </div>
                        <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                            <div className="divide-y divide-slate-100 dark:divide-primary/10">
                                {topTeamMatchPeaks.map((peak, index) => (
                                    <div key={`${peak.matchId}_${peak.teamId}`} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <TeamLogo teamCode={peak.teamId} className="size-11" imgClassName="size-11 object-contain p-1.5" />
                                                <div className="absolute -top-1 -left-1 size-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                                    {index + 1}
                                                </div>
                                            </div>
                                            <div className="max-w-[140px]">
                                                <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">{peak.teamName}</p>
                                                <p className="text-[9px] text-slate-500 font-bold truncate">{peak.matchName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-white">{peak.points.toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Stake</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {subTab === "jackpots" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-green-500 text-xl font-black">emoji_events</span>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Top 10 Jackpot Wins</h3>
                        </div>
                        <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                            <div className="divide-y divide-slate-100 dark:divide-primary/10">
                                {jackpotWins.map((win, index) => (
                                    <div key={win.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-primary/10">
                                                {win.userPhoto ? (
                                                    <img src={win.userPhoto} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-slate-400">person</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 dark:text-slate-100">{win.userName}</p>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{win.matchName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-green-500">+{win.netProfit.toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Net Profit</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {subTab === "rivals" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-primary text-xl font-black">swords</span>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Top 5 Rivalry Strength</h3>
                        </div>
                        <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                            <div className="divide-y divide-slate-100 dark:divide-primary/10">
                                {rivalryStrength.map((rival, index) => (
                                    <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                <TeamLogo teamCode={rival.teamA} className="size-8" imgClassName="size-8 object-contain" />
                                                <TeamLogo teamCode={rival.teamB} className="size-8" imgClassName="size-8 object-contain" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 dark:text-slate-100">{rival.name}</p>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{rival.matchCount} Matches Played</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-white">{rival.points.toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Combined Bets</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {subTab === "teams" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-primary text-xl font-black">analytics</span>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Team Performance Diagnostics</h3>
                        </div>
                        <div className="space-y-4">
                            {teamDetailedStats.map((team) => (
                                <div key={team.id} className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-2xl p-4 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <TeamLogo teamCode={team.id} className="size-12" imgClassName="size-12 object-contain p-1.5" />
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">{team.name}</p>
                                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{team.fullName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-white leading-none">{team.totalPoints.toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Total Volume</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-green-500/5 dark:bg-green-500/10 rounded-xl p-3 border border-green-500/10">
                                            <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                                <span className="material-symbols-outlined text-[14px] text-green-600">trending_up</span>
                                                <span className="text-[9px] font-bold uppercase text-green-700 dark:text-green-500">Global Wins</span>
                                            </div>
                                            <p className="text-sm font-black text-green-600">+{team.totalWin.toLocaleString()}</p>
                                            <div className="mt-2 pt-2 border-t border-green-500/5 flex justify-between items-center">
                                                <span className="text-[8px] font-bold uppercase text-slate-400">Peak Win</span>
                                                <span className="text-[9px] font-black text-green-700">+{team.maxWinInMatch.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-red-500/5 dark:bg-red-500/10 rounded-xl p-3 border border-red-500/10">
                                            <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                                <span className="material-symbols-outlined text-[14px] text-red-600">trending_down</span>
                                                <span className="text-[9px] font-bold uppercase text-red-700 dark:text-red-500">Global Losses</span>
                                            </div>
                                            <p className="text-sm font-black text-red-600">-{team.totalLoss.toLocaleString()}</p>
                                            <div className="mt-2 pt-2 border-t border-red-500/5 flex justify-between items-center">
                                                <span className="text-[8px] font-bold uppercase text-slate-400">Peak Loss</span>
                                                <span className="text-[9px] font-black text-red-700">-{team.maxLossInMatch.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 text-center opacity-30">
                <span className="material-symbols-outlined text-4xl mb-2">insights</span>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">End of Business Insights</p>
            </div>
        </div>
    );
}
