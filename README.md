# 🏏 IPL Arena — The Ultimate Prediction Platform

Welcome to **IPL Arena** — a real-time, interactive prediction and virtual betting experience built to bring people together! 🌟

> [!NOTE]
> ### 👥 Designed for Friends, Office Circles & Long-Distance Connections
> IPL Arena is crafted specifically for **friend groups, office circles, and long-distance buddies** to connect, play, and bet virtual coins on the IPL and other thrilling tournaments! 🏏✨
>
> * 🏢 **Office & Workplace Circles:** Elevate your water-cooler chat and team Slack channels into friendly competitions with your colleagues!
> * ✈️ **Long-Distance Friend Groups:** Stay connected across cities and timezones, keeping the tournament banter alive no matter how far apart you are!
> * 🪙 **Risk-Free Coin Betting:** Settle predictions and rise through the ranks completely risk-free using our dynamic virtual coin system!

Whether you want to test your instincts, climb the live leaderboard, or trigger a dynamic winning team theme sync, IPL Arena creates a shared space for the ultimate cricketing fellowship. 🏆🔥

---

## ✨ Features

### 🌟 1. Dynamic Winner-Based Theme Sync
The entire look and feel of IPL Arena is alive! The application automatically adjusts its active color palette and branding to match the **most recent winning IPL team**. 
* If **CSK** wins, the interface shines in **Canary Yellow**.
* If **KKR** dominates, the UI shifts to **Royal Purple**.
* If **SRH** clinches the match, the platform lights up in **Vibrant Orange**.
* Under the hood, this uses Firestore real-time snapshots to update CSS variables globally on the DOM.

### 💰 2. Predictive Betting & Wallet System
* **Starting Balance**: Every new user starts with **50,000 points**.
* **Match Predictions**: Place, update, or cancel your predictions on upcoming matches before the starting whistle.
* **Smart Point Locking**: Points are automatically held upon betting and fully refunded if a bet is adjusted or cancelled.
* **Playoff Rules**: Minimum and maximum bet limits dynamically scale as the tournament progresses (Qualifier, Eliminator, Final).

### 📈 3. Real-Time Interactive Leaderboard
* Standings update live as matches are settled.
* Monitor performance indicators including **highest winning streaks**, wallet balances, and overall prediction accuracy.

### 👑 4. Executive Admin Command Center
An expansive admin dashboard that gives coordinators full control over the arena:
* **Match Seeding**: Easily seed new match schedules using a custom file configuration.
* **Match Settlement**: Settle games in one click, which automatically calculates payouts, updates user points, distributes streak bonuses, handles refunds, and logs all transaction ledgers.
* **User Accounts**: Manage displayName profiles, manual point adjustments, and account states.
* **Admin Insights**: Performance metrics, user distribution statistics, and predictive activity graphs.

### 📱 5. Progressive Web App (PWA)
* Fully installable on iOS and Android devices for a standalone, app-like mobile experience.
* Offline capability with service worker caching.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Core Architecture** | React 19 + Vite 7 | Lightning-fast HMR and building pipeline |
| **Styling & Theme** | Tailwind CSS v3 | Utility-first styling with custom theme-variable extensions |
| **Database** | Firebase Firestore | Real-time document storage for matches, bets, and users |
| **Authentication** | Firebase Auth | Secure Google OAuth integration |
| **State Management** | Zustand | Clean, decoupled, lightweight global store |
| **Time Sync** | date-fns + Custom Hook | Robust server-time synchronization to prevent front-end time cheating |

---

## 📂 Project Structure

```
sms-main/
├── .ai/                      # UI reference specs & pages
├── public/                   # Static assets, logos, and PWA configurations
├── scripts/                  # Command-line administrative scripts
│   ├── seedMatches.js        # Seed fixture data to Firestore
│   └── settleMatch.js       # Settle matches and update user scores
├── src/
│   ├── assets/               # Local images & team logos (IDs 201-210)
│   ├── components/
│   │   ├── admin/            # Admin widgets (Insights, Streaks, Users)
│   │   ├── layout/           # AppLayout wrappers
│   │   ├── modals/           # UI Modal forms
│   │   └── ui/               # Reusable presentation components
│   ├── constants/            # Playoff stages, admin roles, and logo mappings
│   ├── data/                 # Static JSON fixtures
│   ├── hooks/                # useServerTime, etc.
│   ├── pages/                # Bet, Leaderboard, Live, Schedule, Profile, Login
│   ├── store/                # Zustand global state (auth, etc.)
│   ├── utils/                # Theme managers, settlement helpers
│   ├── App.jsx               # Navigation router & main state listener
│   ├── firebase.js           # Firebase app initializations
│   └── main.jsx              # DOM entrypoint
```

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
First, install the local packages:
```bash
npm install
```

### 2. Configure Firebase Environment
To ensure a frictionless setup for your group, the client-side `.env` configuration is already committed and pre-configured directly in the repository with the necessary Firebase client credentials. 

If you ever need to point the arena to a new or custom Firebase instance, you can modify the values in the `.env` file:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Generate Service Account Key (For CLI Admin Scripts)
To run administrative CLI scripts (like match seeding), you'll need the Firebase Admin SDK private key:
1. Go to your **Firebase Console** -> **Project Settings** -> **Service Accounts**.
2. Click **Generate New Private Key**.
3. Save the downloaded JSON file as **`serviceAccountKey.json`** directly in the root of the project directory.

> [!WARNING]
> Never commit your private **`serviceAccountKey.json`** file to Git (it is ignored by default in `.gitignore`). 
> 
> *Note: For the convenience of our friend and office circle, the client-side `.env` file is pre-configured and committed directly to the repository so everyone can get up and running instantly without manual Firebase setup!*

---

## ⚙️ Running the App

### Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Seed Matches to Firestore
Seed the match schedule (from `src/data/matches.json`) into your Firestore database:
```bash
# Seed new upcoming matches without deleting current ones
npm run seed:matches

# Clear the collections first and seed fresh fixtures
npm run seed:matches -- --clear
```

### Build for Production
To build the application optimized for production:
```bash
npm run build
```

---

## 🎨 Dynamic Team Theme Mappings

The application contains standard HSL themes as well as specialized color variables tailored for every IPL franchise:

| ID | Code | Franchise | Theme Color |
| :--- | :--- | :--- | :--- |
| **201** | `csk` | Chennai Super Kings | 🟡 Canary Yellow |
| **202** | `dc` | Delhi Capitals | 🔵 Navy Blue |
| **203** | `gt` | Gujarat Titans | 🌌 Dark Slate Blue |
| **204** | `kkr` | Kolkata Knight Riders | 🟣 Deep Purple |
| **205** | `lsg` | Lucknow Super Giants | 🔴 Maroon Red |
| **206** | `mi` | Mumbai Indians | 🔵 Electric Cobalt |
| **207** | `pbks` | Punjab Kings | ⚪ Silver / Crimson |
| **208** | `rcb` | Royal Challengers Bengaluru | 🔴 Vibrant Ruby |
| **209** | `rr` | Rajasthan Royals | 💗 Shocking Pink |
| **210** | `srh` | Sunrisers Hyderabad | 🟠 Sunset Orange |

---

## 🤝 Responsible Betting
This application is designed strictly for gaming and mock predictions. No real money is utilized or exchanged at any point in the system. Play responsibly and enjoy the tournament!
