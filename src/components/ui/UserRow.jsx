import React from 'react';

export default function UserRow({ user, type = 'leaderboard', rank, isCurrentUser = false }) {
    const isLeaderboard = type === 'leaderboard';

    // Base wrapper styles
    let wrapperClasses = "p-4 flex items-center gap-4 relative ";

    if (isLeaderboard) {
        wrapperClasses += isCurrentUser
            ? "bg-primary/20 border-2 border-primary rounded-lg shadow-lg shadow-primary/10 pl-6"
            : "bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-lg pl-6";
    } else {
        wrapperClasses += "grid grid-cols-12 bg-background-light dark:bg-background-dark hover:bg-primary/5 transition-colors border-b border-primary/5";
    }

    // Avatar rendering with photoURL support
    const renderAvatar = () => {
        const displayName = user.displayName || user.name || "?";

        if (isCurrentUser && !user.photoURL && !user.avatar) {
            const initials = displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
            return (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-background-dark font-bold text-lg">
                    {initials}
                </div>
            );
        }

        const imgSrc = user.photoURL || user.avatar;
        if (imgSrc) {
            return (
                <img
                    className={isLeaderboard ? "w-10 h-10 rounded-full object-cover" : "size-full object-cover"}
                    alt={displayName}
                    src={imgSrc}
                    referrerPolicy="no-referrer"
                />
            );
        }

        // Fallback: initials
        const initials = displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        return (
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold text-sm">
                {initials}
            </div>
        );
    };

    const displayName = user.displayName || user.name || "Unknown";

    return (
        <div className={wrapperClasses}>

            {/* Left side (Avatar + Name) */}
            <div className={isLeaderboard ? "flex-1 flex items-center gap-4" : "col-span-6 flex items-center gap-3"}>
                {isLeaderboard && (
                    <div className={`absolute -left-3 size-6 rounded-full flex items-center justify-center text-[11px] font-black z-10 shadow-sm border-2 ${isCurrentUser
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-slate-500 border-slate-200"
                        }`}>
                        {rank}
                    </div>
                )}

                {/* Avatar */}
                <div className={`shrink-0 ${isLeaderboard ? 'size-10' : 'size-10 rounded-full border-2 border-primary/20 overflow-hidden'}`}>
                    {renderAvatar()}
                </div>

                {/* User Info */}
                <div className={isLeaderboard ? "flex-1" : ""}>
                    <p className={`font-bold text-sm ${isCurrentUser ? 'text-slate-900 dark:text-slate-100 font-black' : 'text-slate-800 dark:text-slate-200'}`}>
                        {isCurrentUser ? `${displayName} (You)` : displayName}
                    </p>
                    <p className={isLeaderboard ? "text-[10px] text-slate-500" : "text-[10px] text-slate-500"}>
                        ₹892
                    </p>
                </div>
            </div>

            {/* Center Side (Only for Bets) */}
            {!isLeaderboard && user.predictedTeam && (
                <div className="col-span-3 text-center">
                    <div className={`size-8 rounded-full mx-auto flex items-center justify-center ${user.predictedTeam.isPrimary ? 'bg-primary/20 border border-primary/30' : 'bg-slate-500/20'}`}>
                        <span className={`text-[10px] font-bold ${user.predictedTeam.isPrimary ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {user.predictedTeam.name}
                        </span>
                    </div>
                </div>
            )}

            {/* Right side (Points) */}
            <div className={isLeaderboard ? "text-right" : "col-span-3 text-right"}>
                <p className={`font-bold ${isLeaderboard ? 'text-slate-900 dark:text-slate-100 text-lg' : 'text-sm text-slate-900 dark:text-slate-100'}`}>
                    {user.points.toLocaleString()}
                </p>
                {/* isLeaderboard && (
                    <p className="text-[10px] uppercase text-slate-500">
                        Points
                    </p>
                ) */}
            </div>

        </div>
    );
}
