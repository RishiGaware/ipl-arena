import React, { useEffect, useState } from "react";
import { themes, setTheme, loadSavedTheme, hexToRgb } from "../utils/themeUtils";

const ThemeSelector = ({ plain = false }) => {
    const [customColor, setCustomColor] = useState("#21c45d");

    useEffect(() => {
        loadSavedTheme();
    }, []);

    const handleCustomColorChange = (e) => {
        const hex = e.target.value;
        setCustomColor(hex);
        const rgb = hexToRgb(hex);
        setTheme({ primary: rgb });
    };

    const containerClasses = plain 
        ? "flex flex-col gap-5" 
        : "flex flex-col gap-5 p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-primary/5";

    return (
        <div className={containerClasses}>
            <div className="flex items-center gap-2 px-1">
                <span className="material-symbols-outlined text-primary">palette</span>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Theme Settings
                </h3>
            </div>
            
            {/* Standard Themes */}
            <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Standard</p>
                <div className="flex flex-wrap gap-3 p-1">
                    {Object.entries(themes).filter(([name]) => name === 'green' || name === 'blue').map(([name, colors]) => (
                        <button
                            key={name}
                            onClick={() => setTheme(colors)}
                            className="w-12 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:scale-110 active:scale-95 flex items-center justify-center overflow-hidden hover:shadow-lg hover:shadow-primary/20"
                            style={{ backgroundColor: `rgb(${colors.primary})` }}
                            title={`${name.charAt(0).toUpperCase() + name.slice(1)} Theme`}
                        />
                    ))}
                    
                    {/* Custom Color Picker */}
                    <div className="relative group">
                        <input
                            type="color"
                            value={customColor}
                            onChange={handleCustomColorChange}
                            className="w-12 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer overflow-hidden opacity-0 absolute inset-0 z-10"
                        />
                        <div 
                            className="w-12 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg"
                            style={{ backgroundColor: customColor }}
                        >
                            <span className="material-symbols-outlined text-white text-[24px]">add</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* IPL Team Themes */}
            <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">IPL Teams</p>
                <div className="grid grid-cols-5 gap-3 p-1">
                    {Object.entries(themes).filter(([name]) => name !== 'green' && name !== 'blue').map(([name, colors]) => (
                        <button
                            key={name}
                            onClick={() => setTheme(colors)}
                            className="flex flex-col items-center gap-1 group"
                            title={`${name.toUpperCase()} Theme`}
                        >
                            <div 
                                className="w-12 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-all group-hover:scale-110 group-active:scale-95 group-hover:shadow-lg"
                                style={{ backgroundColor: `rgb(${colors.primary})` }}
                            />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-primary transition-colors">
                                {name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-1 border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Personalize your experience with these IPL-inspired color patterns. Your choice will be saved locally.
                </p>
            </div>
        </div>
    );
};

export default ThemeSelector;
