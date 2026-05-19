import { create } from "zustand";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const STARTING_POINTS = 50000;
const REGISTRATION_ENABLED = false;

const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,

  initializeAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      set({ error: null }); // Reset error on auth state change

      if (currentUser) {
        try {
          const ref = doc(db, "users", currentUser.uid);
          const snap = await getDoc(ref);

          if (snap.exists()) {
            // Returning user → sync profile fields (never overwrite points)
            await setDoc(
              ref,
              {
                displayName: currentUser.displayName || "",
                photoURL: currentUser.photoURL || "",
              },
              { merge: true },
            );
          } else {
            if (!REGISTRATION_ENABLED) {
              await signOut(auth);
              set({ 
                user: null, 
                loading: false, 
                error: "New registrations are currently closed. Please contact the administrator." 
              });
              return;
            }

            // First-time sign-in → create user doc with starting balance
            await setDoc(ref, {
              displayName: currentUser.displayName || "",
              email: currentUser.email,
              photoURL: currentUser.photoURL || "",
              points: STARTING_POINTS,
              createdAt: serverTimestamp(),
            });
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          set({ error: "Authentication failed. Please try again." });
        }
      }
      set({ user: currentUser, loading: false });
    });
    return unsubscribe;
  },

  signInWithGoogle: async () => {
    set({ error: null });
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const currentUser = result.user;

      // Double check registration status immediately after sign-in
      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);

      if (!snap.exists() && !REGISTRATION_ENABLED) {
        await signOut(auth);
        const errMsg = "New registrations are currently closed. Please contact the administrator.";
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    } catch (error) {
      // Don't overwrite if it's our custom registration error
      if (!error.message.includes("registrations are currently closed")) {
        set({ error: error.message });
      }
      throw error;
    }
  },

  signOutUser: async () => {
    await signOut(auth);
    set({ user: null, error: null });
  },

  updateDisplayName: async (newDisplayName) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      await updateProfile(currentUser, { displayName: newDisplayName });
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { displayName: newDisplayName });
      set({ user: { ...currentUser, displayName: newDisplayName } });
    } catch (error) {
      console.error("Error updating display name:", error);
      throw error;
    }
  },
}));

export default useAuthStore;
