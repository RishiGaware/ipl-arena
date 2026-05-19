import React from 'react';
import { getTeamLogo, TEAM_SHORT_NAMES } from '../../constants/teamLogos';

/**
 * A reusable component to display a team logo or "TBD" if no logo is available.
 * 
 * @param {Object} props
 * @param {string|number} props.teamCode - The team ID/code
 * @param {string} props.className - Classes for the container
 * @param {string} props.imgClassName - Classes for the image element
 * @param {string} props.tbdClassName - Classes for the TBD text
 */
export default function TeamLogo({ 
    teamCode, 
    className = "size-12", 
    imgClassName = "w-full h-full object-contain p-1",
    tbdClassName = "text-[10px] font-black text-slate-500 dark:text-slate-400"
}) {
    const logo = getTeamLogo(teamCode);
    const shortName = TEAM_SHORT_NAMES[teamCode?.toString()] || "Team";

    if (logo) {
        return (
            <div className={`rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200 dark:border-primary/10 overflow-hidden ${className}`}>
                <img 
                    src={logo} 
                    alt={shortName} 
                    className={imgClassName} 
                />
            </div>
        );
    }

    return (
        <div className={`rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-primary/10 ${className}`}>
            <span className={tbdClassName}>TBD</span>
        </div>
    );
}
