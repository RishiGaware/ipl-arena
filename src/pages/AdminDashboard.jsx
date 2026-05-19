import React, { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import TopHeader from "../components/ui/TopHeader";
import useAuthStore from "../store/useAuthStore";
import { isAdmin } from "../constants/admins";
import AdminPerformance from "../components/admin/AdminPerformance";
import AdminUsers from "../components/admin/AdminUsers";
import AdminInsights from "../components/admin/AdminInsights";
import AdminStreaks from "../components/admin/AdminStreaks";

export default function AdminDashboard() {
    const user = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState("performance");
    const [scrolled, setScrolled] = useState(false);
    const scrollRef = useRef(null);

    // Redirect if not admin
    if (!user || !isAdmin(user.uid)) {
        return <Navigate to="/leaderboard" replace />;
    }

    const tabs = [
        { id: "performance", label: "Performance", icon: "monitoring" },
        { id: "insights", label: "Insights", icon: "insights" },
        { id: "streaks", label: "Streaks", icon: "local_fire_department" },
        { id: "users", label: "Users", icon: "group" },
    ];

    const handleScroll = (e) => {
        setScrolled(e.target.scrollTop > 10);
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case "performance": return <AdminPerformance />;
            case "insights": return <AdminInsights />;
            case "streaks": return <AdminStreaks />;
            case "users": return <AdminUsers />;
            default: return <AdminPerformance />;
        }
    };

    return (
        <div className="flex flex-col w-full h-full relative">
            {/* Top Shadow Fade - Appears when scrolled */}
            <div className={`absolute top-[140px] left-0 right-0 h-8 bg-gradient-to-b from-background-light dark:from-background-dark to-transparent z-30 transition-opacity duration-300 pointer-events-none ${scrolled ? 'opacity-100' : 'opacity-0'}`} />

            <TopHeader title="Admin Dashboard">
                {/* Visual Tab Bar */}
                <div className="px-4 mt-2 mb-2">
                    <div className="flex bg-slate-100 dark:bg-primary/5 p-1 rounded-xl border border-slate-200 dark:border-primary/10 relative">
                        <div 
                            className="absolute bg-white dark:bg-primary/20 h-[calc(100%-8px)] rounded-lg shadow-sm transition-all duration-300 ease-out"
                            style={{
                                width: `calc(${100 / tabs.length}% - 4px)`,
                                left: `calc(${(tabs.indexOf(tabs.find(t => t.id === activeTab)) / tabs.length) * 100}% + 4px)`
                            }}
                        />
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex flex-col items-center justify-center py-2 relative z-10 transition-colors duration-300 ${
                                    activeTab === tab.id ? "text-primary" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px] mb-0.5">{tab.icon}</span>
                                <span className={`text-[10px] font-black uppercase tracking-tight`}>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </TopHeader>

            <main 
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto custom-scrollbar w-full px-4 pb-20 pt-4 max-w-md mx-auto"
            >
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                    {renderActiveTab()}
                </div>
            </main>

            {/* Bottom Shadow Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent z-30 pointer-events-none" />
        </div>
    );
}
