import { format } from "date-fns";

export const DEFAULT_MIN_BET = 50;
export const DEFAULT_MAX_BET = 5000;

// Playoff stages keyed by match date (yyyy-MM-dd, local time).
const STAGE_CONFIG = {
    "2026-05-26": { stage: "Qualifier 1", minBet: 1000, maxBet: 15000 },
    "2026-05-27": { stage: "Eliminator",  minBet: 1000, maxBet: 10000 },
    "2026-05-29": { stage: "Qualifier 2", minBet: 1000, maxBet: 15000 },
    "2026-05-31": { stage: "Final",       minBet: 1000, maxBet: 25000 },
};

function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === "function") return value.toDate();
    return new Date(value);
}

function getConfig(matchStartTime) {
    const dateObj = toDate(matchStartTime);
    if (!dateObj) return null;
    return STAGE_CONFIG[format(dateObj, "yyyy-MM-dd")] || null;
}

export function getBetLimits(matchStartTime) {
    const config = getConfig(matchStartTime);
    if (!config) return { minBet: DEFAULT_MIN_BET, maxBet: DEFAULT_MAX_BET };
    return { minBet: config.minBet, maxBet: config.maxBet };
}

export function isPlayoffMatch(matchStartTime) {
    return getConfig(matchStartTime) !== null;
}
