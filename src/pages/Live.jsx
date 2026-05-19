import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
} from "firebase/firestore";
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";

import TopHeader from "../components/ui/TopHeader";
import TeamLogo from "../components/ui/TeamLogo";
import { getTeamLogo, TEAM_SHORT_NAMES } from "../constants/teamLogos";
import { isPlayoffMatch } from "../constants/stages";
import useServerTime from "../hooks/useServerTime";
import useAuthStore from "../store/useAuthStore";
import { settleMatchClient } from "../utils/settleMatchLogic";
import { db } from "../firebase";
import { setTheme, themes } from "../utils/themeUtils";
import { isAdmin } from "../constants/admins";

export default function Live() {
    const user = useAuthStore((state) => state.user);
    const [activeMatches, setActiveMatches] = useState([]);
    const currentTime = useServerTime(5000);
    const [bets, setBets] = useState([]);
    const [betUsers, setBetUsers] = useState({});   // userId → { displayName, photoURL }
    const [accessError, setAccessError] = useState(null);
    const fetchedUsers = useRef(new Set());

    // ─── Fetch the active matches (upcoming / betting_closed) ──
    useEffect(() => {
        const q = query(
            collection(db, "matches"),
            orderBy("matchStartTime", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matchesData = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const status = data.status?.toLowerCase();

                // Filter locally to avoid missing composite index issues
                if (status === "upcoming" || status === "betting_closed") {
                    const dateObj = data.matchStartTime.toDate();
                    
                    // Determine match stage based on date
                    const dateKey = format(dateObj, "yyyy-MM-dd");
                    const stages = {
                        "2026-05-26": "Qualifier 1",
                        "2026-05-27": "Eliminator",
                        "2026-05-29": "Qualifier 2",
                        "2026-05-31": "Final"
                    };

                    matchesData.push({
                        id: docSnap.id,
                        ...data,
                        date: format(dateObj, "EEE, MMM d"),
                        time: format(dateObj, "h:mm a"),
                        stage: stages[dateKey] || null,
                        _matchTimeMs: dateObj.getTime(),
                    });
                }
            });
            setActiveMatches(matchesData);
        });

        return () => unsubscribe();
    }, []);

    // ─── Derive the live match ───────────────────────────────────
    const liveMatch = useMemo(() => {
        return activeMatches.find(m => m._matchTimeMs <= currentTime) || null;
    }, [activeMatches, currentTime]);

    // ─── Fetch all bets for the live match ───────────────────────
    useEffect(() => {
        if (!liveMatch) {
            // No subscription needed — return a cleanup that resets bets.
            // Using queueMicrotask avoids the synchronous-setState-in-effect warning.
            queueMicrotask(() => setBets([]));
            return;
        }

        const q = query(
            collection(db, "bets"),
            where("matchId", "==", liveMatch.id),
        );

        const unsubscribe = onSnapshot(
            q,
            async (snapshot) => {
                setAccessError(null);
                const betsData = [];
                const userIds = new Set();

                snapshot.forEach((d) => {
                    const data = { id: d.id, ...d.data() };
                    betsData.push(data);
                    userIds.add(data.userId);
                });

                setBets(betsData);

                // Fetch user profiles for avatars and names
                const usersMap = {};
                for (const uid of userIds) {
                    if (fetchedUsers.current.has(uid)) {
                        continue;
                    }
                    fetchedUsers.current.add(uid);
                    try {
                        const userSnap = await getDoc(doc(db, "users", uid));
                        if (userSnap.exists()) {
                            const u = userSnap.data();
                            usersMap[uid] = {
                                displayName: u.displayName || "Unknown",
                                photoURL: u.photoURL || null,
                            };
                        }
                    } catch {
                        usersMap[uid] = { displayName: "Unknown", photoURL: null };
                    }
                }
                setBetUsers((prev) => ({ ...prev, ...usersMap }));
            }, (error) => {
                if (error.code === 'permission-denied') {
                    setAccessError("permission-denied");
                    setBets([]);
                } else {
                    console.error("Live bets error:", error);
                }
            });

        return () => unsubscribe();
    }, [liveMatch]);

    // ─── Calculate bet distribution ──────────────────────────────
    const betStats = useMemo(() => {
        if (!liveMatch || bets.length === 0) {
            return { teamACount: 0, teamBCount: 0, teamAPool: 0, teamBPool: 0, teamAPercent: 50, teamBPercent: 50, totalBets: 0, totalPool: 0, rewardPoolIfAWins: 0, rewardPoolIfBWins: 0 };
        }

        const teamABets = bets.filter((b) => b.team.toString() === liveMatch.teamA.toString());
        const teamBBets = bets.filter((b) => b.team.toString() === liveMatch.teamB.toString());

        const teamAPool = teamABets.reduce((sum, b) => sum + b.points, 0);
        const teamBPool = teamBBets.reduce((sum, b) => sum + b.points, 0);
        const totalPool = teamAPool + teamBPool;

        const teamAPercent = totalPool > 0 ? Math.round((teamAPool / totalPool) * 100) : 50;
        const teamBPercent = totalPool > 0 ? 100 - teamAPercent : 50;

        // Whale Cap Logic for Potential Profits
        const maxBetA = teamABets.length > 0 ? Math.max(...teamABets.map(b => b.points)) : 0;
        const maxBetB = teamBBets.length > 0 ? Math.max(...teamBBets.map(b => b.points)) : 0;

        const rewardPoolIfAWins = teamBBets.reduce((sum, b) => sum + Math.min(b.points, maxBetA), 0);
        const rewardPoolIfBWins = teamABets.reduce((sum, b) => sum + Math.min(b.points, maxBetB), 0);

        return {
            teamACount: teamABets.length,
            teamBCount: teamBBets.length,
            teamAPool,
            teamBPool,
            teamAPercent,
            teamBPercent,
            totalBets: bets.length,
            totalPool,
            maxBetA,
            maxBetB,
            rewardPoolIfAWins,
            rewardPoolIfBWins
        };
    }, [bets, liveMatch]);

    // ─── Sorted Bets for Display ────────────────────────────────
    const sortedBets = useMemo(() => {
        if (!liveMatch) return [];

        const teamABets = bets
            .filter((b) => b.team.toString() === liveMatch.teamA.toString())
            .sort((a, b) => b.points - a.points); // Highest to lowest

        const teamBBets = bets
            .filter((b) => b.team.toString() === liveMatch.teamB.toString())
            .sort((a, b) => a.points - b.points); // Lower to highest

        // Include any other bets that might not match team A or B (safety)
        const otherBets = bets.filter(
            (b) =>
                b.team.toString() !== liveMatch.teamA.toString() &&
                b.team.toString() !== liveMatch.teamB.toString()
        );

        return [...teamABets, ...teamBBets, ...otherBets];
    }, [bets, liveMatch]);

    // ─── Avatar helper ───────────────────────────────────────────
    const renderUserAvatar = (userId) => {
        const u = betUsers[userId];
        if (u?.photoURL) {
            return (
                <img
                    src={u.photoURL}
                    alt={u.displayName}
                    className="size-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                />
            );
        }
        const initials = (u?.displayName || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        return (
            <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold text-[10px]">
                {initials}
            </div>
        );
    };

    // ─── Admin Settlement Logic ──────────────────────────────────
    const [isSettling, setIsSettling] = useState(false);
    const handleSettle = async (winnerTeam) => {
        if (!window.confirm("Are you sure you want to settle this match? This is irreversible.")) return;
        setIsSettling(true);
        try {
            await settleMatchClient(liveMatch.id, winnerTeam, bets);
            alert("Match settled successfully!");

        } catch (error) {
            console.error(error);
            alert("Error settling match: " + error.message);
        } finally {
            setIsSettling(false);
        }
    };

    // Playoff matches hide community bets from regular users until admin settles.
    const isViewerAdmin = !!(user && isAdmin(user.uid));
    const hidePlayoffBets = !!liveMatch && isPlayoffMatch(liveMatch.matchStartTime) && !isViewerAdmin;

    // ─── No live match state ─────────────────────────────────────
    if (!liveMatch) {
        return (
            <div className="flex flex-col w-full h-full">
                <TopHeader title="Live Match" />
                <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-center p-12 opacity-50">
                    <span className="material-symbols-outlined text-5xl mb-3">sports_cricket</span>
                    <p className="font-semibold">No live match right now</p>
                    <p className="text-sm text-slate-500 mt-1">Check back when a match starts!</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full">
            <TopHeader title="Live Match" />

            <main className="flex-1 overflow-y-auto custom-scrollbar w-full pb-6 max-w-md mx-auto space-y-5 pt-4">

                {/* Match Hero Card */}
                <div className="px-4">
                    <div className="card-base !p-0 overflow-hidden relative border-0">
                        {/* Dark gradient background */}
                        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                        <div className="absolute inset-0 opacity-15 pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle at 30% 50%, var(--color-primary), transparent 60%), radial-gradient(circle at 70% 50%, var(--color-primary), transparent 60%)' }} />

                        <div className="relative z-20 p-6 flex flex-col min-h-[180px]">
                            {/* Top row: LIVE badge + venue */}
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-1.5">
                                    <span className="tag-live backdrop-blur-sm bg-red-500/40 text-red-100 border border-red-500/50">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />{" "}
                                        LIVE
                                    </span>
                                    {liveMatch.stage && (
                                        <span className="text-[10px] font-black text-primary bg-primary/20 px-2 py-0.5 rounded w-fit uppercase tracking-tighter">
                                            {liveMatch.stage}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase">{liveMatch.venue}</p>
                                    <p className="text-[10px] text-slate-500">{liveMatch.date} • {liveMatch.time}</p>
                                </div>
                            </div>

                            {/* Teams */}
                            <div className="flex items-center justify-center gap-8 mt-auto pt-6">
                                <div className="flex flex-col items-center gap-2">
                                    <TeamLogo
                                        teamCode={liveMatch.teamA}
                                        className="size-16 drop-shadow-lg"
                                        imgClassName="size-16 object-contain p-1.5"
                                        tbdClassName="text-sm font-black text-slate-400"
                                    />
                                    <span className="text-white font-bold text-sm">
                                        {TEAM_SHORT_NAMES[liveMatch.teamA] || liveMatch.teamA}
                                    </span>
                                </div>

                                <span className="text-xl font-black text-slate-500 italic">VS</span>

                                <div className="flex flex-col items-center gap-2">
                                    <TeamLogo
                                        teamCode={liveMatch.teamB}
                                        className="size-16 drop-shadow-lg"
                                        imgClassName="size-16 object-contain p-1.5"
                                        tbdClassName="text-sm font-black text-slate-400"
                                    />
                                    <span className="text-white font-bold text-sm">
                                        {TEAM_SHORT_NAMES[liveMatch.teamB] || liveMatch.teamB}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {accessError === "permission-denied" ? (
                    <div className="mx-4 bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                        <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-slate-400">lock</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Predictions Locked</h3>
                        <p className="text-xs text-slate-500 px-4">
                            Community bets are hidden until the match officially starts to prevent spoilers.
                        </p>
                    </div>
                ) : hidePlayoffBets ? (
                    <div className="mx-4 bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                        <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-slate-400">visibility_off</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Predictions Hidden</h3>
                        <p className="text-xs text-slate-500 px-4">
                            For playoff matches, community bets stay private until the admin settles the result.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Bet Distribution Bar */}
                        <div className="px-4">
                            <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <TeamLogo teamCode={liveMatch.teamA} className="size-5" imgClassName="size-5 object-contain" />
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                            {TEAM_SHORT_NAMES[liveMatch.teamA]} ({betStats.teamAPercent}%)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                            ({betStats.teamBPercent}%) {TEAM_SHORT_NAMES[liveMatch.teamB]}
                                        </span>
                                        <TeamLogo teamCode={liveMatch.teamB} className="size-5" imgClassName="size-5 object-contain" />
                                    </div>
                                </div>
                                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                    <div
                                        className="bg-primary h-full rounded-l-full transition-all duration-500"
                                        style={{ width: `${betStats.teamAPercent}%` }}
                                    />
                                    <div
                                        className="bg-slate-400 h-full rounded-r-full transition-all duration-500"
                                        style={{ width: `${betStats.teamBPercent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[10px] text-slate-500">{betStats.teamAPool?.toLocaleString()}</span>
                                    <span className="text-[10px] text-slate-500">{betStats.teamBPool?.toLocaleString()}</span>
                                </div>
                                <p className="text-[10px] text-center text-slate-500 mt-2 uppercase tracking-wider">
                                    Community Bet Distribution • {betStats.totalPool?.toLocaleString()} total
                                </p>
                            </div>
                        </div>

                        {/* Live Predictions Table */}
                        <section className="px-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Live Predictions</h4>
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-1 rounded font-bold">
                                    {betStats.totalBets} {betStats.totalBets === 1 ? "Bet" : "Bets"}
                                </span>
                            </div>

                            {bets.length === 0 ? (
                                <div className="text-center py-8 opacity-50">
                                    <span className="material-symbols-outlined text-3xl mb-2">casino</span>
                                    <p className="text-sm">No bets placed yet</p>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl overflow-hidden">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-12 bg-slate-50 dark:bg-primary/10 border-b border-slate-200 dark:border-primary/10 p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                        <div className="col-span-6">Player</div>
                                        <div className="col-span-3 text-center">Pick</div>
                                        <div className="col-span-3 text-right">Bet</div>
                                    </div>

                                    {/* Bet Rows */}
                                    <div className="flex flex-col divide-y divide-slate-100 dark:divide-primary/10">
                                        {sortedBets.map((bet) => {
                                            const userName = betUsers[bet.userId]?.displayName || "...";
                                            const isMe = user?.uid === bet.userId;

                                            return (
                                                <div
                                                    key={bet.id}
                                                    className={`grid grid-cols-12 p-3 items-center ${isMe ? 'bg-primary/10' : 'hover:bg-primary/5'} transition-colors`}
                                                >
                                                    {/* Player */}
                                                    <div className="col-span-6 flex items-center gap-2 min-w-0">
                                                        {renderUserAvatar(bet.userId)}
                                                        <span className={`text-sm font-medium truncate ${isMe ? 'text-slate-900 dark:text-slate-100 font-black' : ''}`}>
                                                            {isMe ? "You" : userName}
                                                        </span>
                                                    </div>

                                                    {/* Pick — team logo */}
                                                    <div className="col-span-3 flex justify-center">
                                                        <div className="flex items-center p-1 rounded-lg">
                                                            <TeamLogo teamCode={bet.team} className="size-10" imgClassName="size-10 object-contain" />
                                                        </div>
                                                    </div>

                                                    {/* Bet Amount & Potential Win */}
                                                    <div className="col-span-3 text-right flex flex-col items-end">
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {bet.points.toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 text-right">
                                                            +{(() => {
                                                                const isTeamA = bet.team.toString() === liveMatch.teamA.toString();
                                                                const pool = isTeamA ? betStats.teamAPool : betStats.teamBPool;
                                                                const rewardPool = isTeamA ? betStats.rewardPoolIfAWins : betStats.rewardPoolIfBWins;
                                                                if (pool === 0) return 0;
                                                                return Math.floor((bet.points / pool) * rewardPool).toLocaleString();
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {/* Admin Settlement UI */}
                {user && isAdmin(user.uid) && (
                    <div className="px-4 mt-6 pb-4">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center shadow-lg">
                            <h4 className="text-red-500 font-bold mb-3 uppercase text-sm tracking-wider flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-sm">warning</span> Admin Danger Zone
                            </h4>
                            <div className="flex gap-2 justify-center flex-wrap">
                                <button
                                    onClick={() => handleSettle(liveMatch.teamA)}
                                    disabled={isSettling}
                                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                                >
                                    {TEAM_SHORT_NAMES[liveMatch.teamA]} Won
                                </button>
                                <button
                                    onClick={() => handleSettle(liveMatch.teamB)}
                                    disabled={isSettling}
                                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                                >
                                    {TEAM_SHORT_NAMES[liveMatch.teamB]} Won
                                </button>
                                <button
                                    onClick={() => handleSettle("refund")}
                                    disabled={isSettling}
                                    className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Refund All
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
