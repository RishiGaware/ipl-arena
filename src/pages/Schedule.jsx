import { format } from "date-fns";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import React, { useState, useEffect, useMemo } from "react";

import MatchCard from "../components/ui/MatchCard";
import TopHeader from "../components/ui/TopHeader";
import useAuthStore from "../store/useAuthStore";
import { db } from "../firebase";

export default function Schedule() {
    const [activeTab, setActiveTab] = useState("upcoming");
    const [matches, setMatches] = useState([]);
    const [userBets, setUserBets] = useState({});
    const user = useAuthStore(state => state.user);
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    // Timer to update the current time every 10 seconds for real-time match hiding
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
        return () => clearInterval(timer);
    }, []);

    // Fetch matches from Firestore
    useEffect(() => {
        const q = query(collection(db, "matches"), orderBy("matchStartTime", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matchesData = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // Format Firestore Timestamp into date and time strings
                const dateObj = data.matchStartTime.toDate();
                const dateStr = format(dateObj, "MMM d, yyyy");
                const timeStr = format(dateObj, "h:mm a");

                // Determine match stage based on date
                const dateKey = format(dateObj, "yyyy-MM-dd");
                const stages = {
                    "2026-05-26": "Qualifier 1",
                    "2026-05-27": "Eliminator",
                    "2026-05-29": "Qualifier 2",
                    "2026-05-31": "Final"
                };

                matchesData.push({
                    id: doc.id,
                    ...data,
                    date: dateStr,
                    time: timeStr,
                    stage: stages[dateKey] || null,
                    _matchTimeMs: dateObj.getTime()
                });
            });
            setMatches(matchesData);
        });

        return () => unsubscribe();
    }, []);

    // Fetch current user's bets
    useEffect(() => {
        if (!user) {
            queueMicrotask(() => setUserBets({}));
            return;
        }

        const q = query(collection(db, "bets"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const betsData = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                betsData[data.matchId] = {
                    id: doc.id,
                    ...data
                };
            });
            setUserBets(betsData);
        });

        return () => unsubscribe();
    }, [user]);

    // Filter the matches based on the selected tab
    const filteredMatches = useMemo(() => {
        const filtered = matches.filter((match) => {
            if (activeTab === "upcoming") {
                return (match.status === "upcoming" || match.status === "UPCOMING") && match._matchTimeMs > currentTime;
            }
            return match.status === "finished" || match.status === "FINAL";
        });

        // Sort descending if "past" tab is active (latest matches first)
        if (activeTab === "past") {
            return filtered.sort((a, b) => b._matchTimeMs - a._matchTimeMs);
        }

        return filtered;
    }, [activeTab, matches, currentTime]);

    // Group the matches by date for display purposes
    const matchesByDate = useMemo(() => {
        const grouped = {};
        filteredMatches.forEach(match => {
            if (!grouped[match.date]) {
                grouped[match.date] = [];
            }
            grouped[match.date].push(match);
        });
        return grouped;
    }, [filteredMatches])

    return (
        <div className="flex flex-col w-full h-full">
            <TopHeader title="Match Center">
                {/* Navigation Tabs (Upcoming / Past) */}
                <div className="px-4">
                    <div className="flex border-b border-slate-200 dark:border-primary/20">
                        <button
                            onClick={() => setActiveTab("upcoming")}
                            className={`flex-1 flex flex-col items-center justify-center border-b-2 pb-3 pt-2 ${activeTab === "upcoming" ? "border-primary" : "border-transparent"
                                }`}
                        >
                            <span className={`text-sm font-bold ${activeTab === "upcoming" ? "text-primary" : "text-slate-500"}`}>
                                Upcoming
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("past")}
                            className={`flex-1 flex flex-col items-center justify-center border-b-2 pb-3 pt-2 ${activeTab === "past" ? "border-primary" : "border-transparent"
                                }`}
                        >
                            <span className={`text-sm font-bold ${activeTab === "past" ? "text-primary dark:text-primary" : "text-slate-500 dark:text-slate-400"}`}>
                                Past
                            </span>
                        </button>
                    </div>
                </div>
            </TopHeader>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar w-full pb-6 max-w-md mx-auto">

                {Object.entries(matchesByDate).length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-50">
                        <span className="material-symbols-outlined text-4xl mb-2">calendar_today</span>
                        <p>No matches available.</p>
                    </div>
                )}

                {Object.entries(matchesByDate).map(([date, matches], index) => (
                    <React.Fragment key={date}>
                        {/* Date Header string */}
                        <div className={`px-4 pt-${index === 0 ? '6' : '8'} pb-2 flex items-center justify-between`}>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                                {date}
                            </h3>
                        </div>

                        {/* Matches list for that date */}
                        <div className={`px-4 ${activeTab === 'past' ? 'space-y-3' : 'space-y-3'}`}>
                            {matches.map((match) => (
                                <MatchCard key={match.id} match={match} userBet={userBets[match.id]} />
                            ))}
                        </div>
                    </React.Fragment>
                ))}

            </main>
        </div>
    );
}
