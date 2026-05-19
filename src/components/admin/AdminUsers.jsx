import { addDoc, collection, doc, increment, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";

import { db } from "../../firebase";

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [bets, setBets] = useState([]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            usersData.sort((a, b) => (b.points || 0) - (a.points || 0));
            setUsers(usersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(
            collection(db, "bets"),
            where("result", "in", ["won", "lost"])
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setBets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const userStats = useMemo(() => {
        const stats = {};
        bets.forEach(bet => {
            if (!stats[bet.userId]) stats[bet.userId] = { win: 0, lose: 0 };
            if (bet.result === "won") stats[bet.userId].win += (bet.netProfit || 0);
            else if (bet.result === "lost") stats[bet.userId].lose += (bet.netLoss || 0);
        });
        return stats;
    }, [bets]);

    const handleAdjustPoints = async (type) => {
        if (!selectedUser || !amount || isProcessing) return;
        const pts = parseInt(amount);
        if (isNaN(pts) || pts <= 0) {
            alert("Invalid amount");
            return;
        }

        setIsProcessing(true);
        try {
            const userRef = doc(db, "users", selectedUser.id);
            const finalAmount = type === "credit" ? pts : -pts;

            await updateDoc(userRef, {
                points: increment(finalAmount)
            });

            await addDoc(collection(db, "transactions"), {
                userId: selectedUser.id,
                type: type === "credit" ? "admin_credit" : "admin_debit",
                points: pts,
                note: note || "Admin manual adjustment",
                createdAt: serverTimestamp()
            });

            alert(`Successfully ${type}ed ${pts} points to ${selectedUser.displayName}`);
            setSelectedUser(null);
            setAmount("");
            setNote("");
        } catch (error) {
            console.error("Adjustment error:", error);
            alert("Error adjusting points");
        } finally {
            setIsProcessing(false);
        }
    };

    const renderAvatar = (userData, size = "size-10") => {
        if (userData.photoURL) {
            return (
                <img
                    className={`${size} rounded-full object-cover border border-slate-200 dark:border-primary/20 shadow-sm`}
                    alt={userData.displayName}
                    src={userData.photoURL}
                    referrerPolicy="no-referrer"
                />
            );
        }
        const initials = (userData.displayName || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        return (
            <div className={`${size} rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold text-xs border border-slate-300 dark:border-slate-700`}>
                {initials}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col w-full h-full items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-primary/10 bg-slate-50/50 dark:bg-primary/5 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">User Management</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Manage user points and balance</p>
                    </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-primary/10">
                    {users.map((u) => (
                        <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                            <div className="flex items-center gap-3">
                                {renderAvatar(u)}
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{u.displayName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] text-slate-500">Bal: <span className="font-bold text-white">{u.points?.toLocaleString()}</span></p>
                                        <p className="text-[10px] text-green-500 font-bold">W: {userStats[u.id]?.win.toLocaleString() || 0}</p>
                                        <p className="text-[10px] text-red-500 font-bold">L: {userStats[u.id]?.lose.toLocaleString() || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedUser(u)}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase"
                            >
                                Manage
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Adjustment Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-6 space-y-6 relative">
                        <div className="text-center">
                            {renderAvatar(selectedUser, "size-16 mx-auto mb-3")}
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase">{selectedUser.displayName}</h2>
                            <div className="flex items-center justify-center gap-3 mt-2">
                                <div className="text-center px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-white/5">
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Balance</p>
                                    <p className="text-xs font-black text-primary">{selectedUser.points?.toLocaleString()}</p>
                                </div>
                                <div className="text-center px-3 py-1 bg-green-500/5 rounded-lg border border-green-500/10">
                                    <p className="text-[8px] text-green-600/70 font-bold uppercase">Total Win</p>
                                    <p className="text-xs font-black text-green-500">{userStats[selectedUser.id]?.win.toLocaleString() || 0}</p>
                                </div>
                                <div className="text-center px-3 py-1 bg-red-500/5 rounded-lg border border-red-500/10">
                                    <p className="text-[8px] text-red-600/70 font-bold uppercase">Total Loss</p>
                                    <p className="text-xs font-black text-red-500">{userStats[selectedUser.id]?.lose.toLocaleString() || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Amount</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter points (e.g. 500)"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-primary/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Note (Optional)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="e.g. Deposit match bonus"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-primary/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleAdjustPoints("credit")}
                                disabled={isProcessing || !amount}
                                className="py-3 rounded-xl bg-green-500 text-white text-xs font-bold uppercase hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50"
                            >
                                Credit (+)
                            </button>
                            <button
                                onClick={() => handleAdjustPoints("debit")}
                                disabled={isProcessing || !amount}
                                className="py-3 rounded-xl bg-red-500 text-white text-xs font-bold uppercase hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                Debit (-)
                            </button>
                        </div>

                        <button
                            onClick={() => setSelectedUser(null)}
                            disabled={isProcessing}
                            className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold uppercase"
                        >
                            Cancel
                        </button>

                        {isProcessing && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
