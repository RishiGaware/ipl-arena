import React, { useState } from "react";
import useAuthStore from "../store/useAuthStore";
import UpdateNameModal from "../components/modals/UpdateNameModal";


export default function Profile() {
    const { user, signOutUser } = useAuthStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="flex flex-col w-full h-full p-6 max-w-2xl mx-auto">
            <header className="flex items-center gap-3 mb-8">
                <span className="material-symbols-outlined text-primary text-3xl">account_circle</span>
                <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
            </header>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-[2rem] flex flex-col items-center shadow-xl shadow-primary/5 transition-all duration-300">
                {/* Avatar Section */}
                <div className="relative group mb-6">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt="Profile"
                            className="w-28 h-28 rounded-full border-4 border-primary/20 shadow-lg group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl font-bold text-primary border-4 border-primary/10 shadow-lg group-hover:scale-105 transition-transform duration-300">
                            {user?.displayName?.[0]?.toUpperCase() || "U"}
                        </div>
                    )}
                </div>

                {/* Name Section - Clickable */}
                <div 
                    className="flex flex-col items-center mb-8 w-full group cursor-pointer transition-all active:scale-95" 
                    onClick={() => setIsModalOpen(true)}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white border-b-2 border-transparent group-hover:border-primary/30 pb-0.5 transition-all">
                            {user?.displayName || "User"}
                        </h2>
                        <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-primary transition-colors">edit</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-4 py-1.5 rounded-full text-sm font-medium border border-slate-100 dark:border-slate-800">
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                        {user?.email}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Click to edit name</p>
                </div>

                <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-8"></div>

                {/* Logout Button */}
                <button
                    onClick={signOutUser}
                    className="w-full group bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-bold py-4 px-6 rounded-2xl transition-all duration-300 border border-red-100 dark:border-red-500/20 flex items-center justify-center gap-3 active:scale-95 shadow-sm hover:shadow-md"
                >
                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">logout</span>
                    LOGOUT FROM ACCOUNT
                </button>
            </div>

            {/* Reusable Update Name Modal */}
            <UpdateNameModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
        </div>
    );
}
