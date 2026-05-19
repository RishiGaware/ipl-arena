import React, { useState, useEffect } from "react";

import useAuthStore from "../../store/useAuthStore";

export default function UpdateNameModal({ isOpen, onClose }) {
  const { user, updateDisplayName } = useAuthStore();
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setNewName(user.displayName);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmedName = newName.trim();

    if (!trimmedName || trimmedName === user?.displayName) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await updateDisplayName(trimmedName);
      onClose();
    } catch (error) {
      alert("Failed to update name. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/40 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-6 text-center text-slate-800 dark:text-white">Edit Profile</h3>
        <div className="space-y-4">
          <div className="relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 absolute top-3 left-6">Display Name</label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary pt-8 pb-4 px-6 rounded-2xl text-lg font-bold outline-none transition-all duration-200"
              placeholder="Enter your name"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !newName.trim()}
              className="flex-2 bg-primary text-white font-bold py-4 px-6 rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "SAVE NAME"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
