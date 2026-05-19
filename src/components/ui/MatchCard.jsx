import React from 'react';

import { getTeamLogo } from '../../constants/teamLogos';
import TeamLogo from './TeamLogo';

export default function MatchCard({ match, userBet }) {
    const {
        status,
        teamA,
        teamB,
        venue,
        time,
        winner, // "201" or "202" representing the team
        stage
    } = match;

    const isPast = status === 'finished' || status === 'FINAL';

    // Calculate footer content based on user status and match status
    // Calculate footer content based on user status and match status
    const renderFooterRight = () => {
        // 1. Match hasn't started yet
        if (!isPast) {
            return (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {time}
                </span>
            );
        }

        // 2. Match past/finished, but user didn't bet
        if (!userBet) {
            return (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    NO BET
                </span>
            );
        }

        // 3. Match settled - User Won
        if (userBet.result === 'won') {
            const netProfit = userBet.netProfit ?? ((userBet.winnings || 0) - userBet.points);

            return (
                <span className="text-[10px] font-bold text-green-500 bg-green-100 px-2 py-0.5 rounded">
                    +{netProfit} PTS
                </span>
            );
        }

        // 4. Match settled - User Lost
        if (userBet.result === 'lost') {
            const netLoss = userBet.netLoss ?? (userBet.points - (userBet.refund || 0));

            return (
                <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">
                    -{netLoss} PTS
                </span>
            );
        }

        // 5. Match settled - User Fully Refunded (0 Net Loss/Profit)
        if (userBet.result === 'refunded') {
            return (
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                    0 PTS
                </span>
            );
        }

        // 6. Match Finished but Not Yet Settled by Admin (Pending state)
        const pickedWinner = userBet.team === winner;
        if (pickedWinner) {
            return (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    PENDING WIN
                </span>
            );
        } else {
            return (
                <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">
                    -{userBet.points} PTS
                </span>
            );
        }
    };

    return (
        <div className="card-base mb-3 relative overflow-hidden">
            {stage && (
                <div className="absolute top-0 right-0">
                    <div className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter border-l border-b border-primary/20">
                        {stage}
                    </div>
                </div>
            )}

            {/* Teams & Score */}
            <div className="flex items-center justify-between gap-2 mt-2">
                {/* Team A */}
                <div className={`flex flex-col items-center flex-1 gap-2 ${isPast && winner && winner.toString() === teamB.toString() ? 'opacity-40' : ''}`}>
                    <TeamLogo
                        teamCode={teamA}
                        className={`size-20 transition-all duration-500 ${isPast && winner && winner.toString() === teamA.toString()
                            ? 'ring-4 ring-primary ring-offset-2 dark:ring-offset-slate-900 shadow-lg shadow-primary/20'
                            : ''
                            }`}
                        imgClassName="w-full h-full object-contain p-2"
                        tbdClassName="text-xl font-black text-slate-400"
                    />
                </div>

                {/* Divider */}
                <div className="flex flex-col items-center px-4">
                    <span className="text-xs font-bold text-slate-400">
                        VS
                    </span>
                </div>

                {/* Team B */}
                <div className={`flex flex-col items-center flex-1 gap-2 ${isPast && winner && winner.toString() === teamA.toString() ? 'opacity-40' : ''}`}>
                    <TeamLogo
                        teamCode={teamB}
                        className={`size-20 transition-all duration-500 ${isPast && winner && winner.toString() === teamB.toString()
                            ? 'ring-4 ring-primary ring-offset-2 dark:ring-offset-slate-900 shadow-lg shadow-primary/20'
                            : ''
                            }`}
                        imgClassName="w-full h-full object-contain p-2"
                        tbdClassName="text-xl font-black text-slate-400"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[1rem]">location_on</span>
                    <span className="text-xs">{venue}</span>
                </div>

                {renderFooterRight()}
            </div>
        </div>
    );
}
