/**
 * Utility to manage theme colors dynamically.
 * These colors update the CSS variables defined in :root.
 */

export const themes = {
    // Standard Themes
    green: {
        primary: "33 196 93", // #21c45d
        backgroundLight: "246 248 247",
        backgroundDark: "18 32 23",
    },
    blue: {
        primary: "37 99 235", // #2563eb
        backgroundLight: "240 249 255",
        backgroundDark: "15 23 42",
    },

    // IPL Team Themes
    csk: {
        primary: "255 254 45", // Yellow
        backgroundLight: "255 251 235", 
        backgroundDark: "26 26 0",
        teamId: 201
    },
    mi: {
        primary: "0 75 160", // Blue
        backgroundLight: "240 247 255",
        backgroundDark: "0 28 61",
        teamId: 206
    },
    rcb: {
        primary: "255 30 30", // Brighter Vibrant Red
        backgroundLight: "255 241 241",
        backgroundDark: "15 0 0",
        teamId: 208
    },
    kkr: {
        primary: "58 34 93", // Purple
        backgroundLight: "245 243 255",
        backgroundDark: "21 0 45",
        teamId: 204
    },
    gt: {
        primary: "27 33 51", // Dark Blue
        backgroundLight: "241 245 249",
        backgroundDark: "11 15 26",
        teamId: 203
    },
    dc: {
        primary: "0 0 128", // Navy Blue
        backgroundLight: "240 244 255",
        backgroundDark: "0 0 48",
        teamId: 202
    },
    lsg: {
        primary: "128 0 0", // Dark Red (Maroon)
        backgroundLight: "254 242 242",
        backgroundDark: "28 0 0",
        teamId: 205
    },
    pbks: {
        primary: "192 192 192", // Silver
        backgroundLight: "241 245 249",
        backgroundDark: "15 23 42",
        teamId: 207
    },
    rr: {
        primary: "234 26 133", // Pink
        backgroundLight: "255 241 242",
        backgroundDark: "45 0 26",
        teamId: 209
    },
    srh: {
        primary: "242 101 34", // Orange
        backgroundLight: "255 247 237",
        backgroundDark: "45 16 0",
        teamId: 210
    }
};

/**
 * Updates the theme colors in the DOM.
 * @param {Object} theme - An object containing primary, backgroundLight, and backgroundDark in RGB format (space separated).
 */
export const setTheme = (theme) => {
    const root = document.documentElement;
    if (theme.primary) root.style.setProperty("--color-primary", theme.primary);
    if (theme.backgroundLight) root.style.setProperty("--color-background-light", theme.backgroundLight);
    if (theme.backgroundDark) root.style.setProperty("--color-background-dark", theme.backgroundDark);

    // Optional: Save to localStorage for persistence
    localStorage.setItem("app-theme-colors", JSON.stringify(theme));
};

/**
 * Loads the saved theme from localStorage.
 */
export const loadSavedTheme = () => {
    const savedTheme = localStorage.getItem("app-theme-colors");
    if (savedTheme) {
        setTheme(JSON.parse(savedTheme));
    }
};

/**
 * Helper to convert HEX to RGB (space-separated) for our CSS variables.
 * @param {string} hex 
 * @returns {string} - "r g b"
 */
export const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
};
