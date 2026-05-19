/* eslint-disable no-undef */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import admin from "firebase-admin";

export const TEAM_NAMES = {
  201: "Chennai Super Kings",
  202: "Delhi Capitals",
  203: "Gujarat Titans",
  204: "Kolkata Knight Riders",
  205: "Lucknow Super Giants",
  206: "Mumbai Indians",
  207: "Punjab Kings",
  208: "Royal Challengers Bangalore",
  209: "Rajasthan Royals",
  210: "Sunrisers Hyderabad",
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const serviceAccountPath = resolve(ROOT, "serviceAccountKey.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── TERMINAL PROMPT HELPER ──────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// ─── MATHEMATICALLY PERFECT DISTRIBUTION ─────────────────────────
// Distributes points perfectly among bets without fractions.
function distributePoints(totalAmountToDistribute, bets) {
  const totalWeight = bets.reduce((sum, b) => sum + b.points, 0);
  if (totalWeight === 0) return new Map(bets.map((b) => [b.id, 0]));

  let distributed = 0;
  const allocations = bets.map((b) => {
    const exact = (b.points / totalWeight) * totalAmountToDistribute;
    const floor = Math.floor(exact);
    distributed += floor;
    return { id: b.id, floor, exact, remainder: exact - floor };
  });

  let leftover = totalAmountToDistribute - distributed;
  allocations.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < leftover; i++) {
    allocations[i].floor += 1;
  }

  return new Map(allocations.map((a) => [a.id, a.floor]));
}

// ─── MAIN SETTLEMENT ─────────────────────────────────────────────
async function settleMatch(matchId) {
  console.log("━".repeat(60));
  console.log("  ⚖️  Match Settlement Engine (Highest Winner Cap)");
  console.log("━".repeat(60));

  const matchRef = db.collection("matches").doc(matchId);
  const matchSnap = await matchRef.get();

  if (!matchSnap.exists) {
    console.error(`\n❌ Match not found.`);
    process.exit(1);
  }
  if (matchSnap.data().status === "finished") {
    console.error("\n❌ Match already settled.");
    process.exit(1);
  }

  const betsSnap = await db
    .collection("bets")
    .where("matchId", "==", matchId)
    .get();

  if (betsSnap.empty) {
    console.log("\n📭 No bets placed on this match.");
    process.exit(0);
  }

  const allBets = [];
  betsSnap.forEach((d) => allBets.push({ id: d.id, ...d.data() }));

  // Find unique teams that users bet on
  const teams = [...new Set(allBets.map((b) => b.team.toString()))];

  // --- INTERACTIVE CLI PROMPT ---
  console.log("\n🏆 Select the winning team:");
  teams.forEach((team, index) => {
    console.log(`   ${index + 1}) Team ${TEAM_NAMES[team]}`);
  });
  console.log(`   0) Cancel and Exit`);

  let winner = null;
  while (!winner) {
    const answer = await askQuestion("\nEnter choice (number): ");
    const choice = parseInt(answer.trim(), 10);

    if (choice === 0) {
      console.log("Exiting...");
      process.exit(0);
    } else if (choice > 0 && choice <= teams.length) {
      winner = teams[choice - 1];
    } else {
      console.log("❌ Invalid choice. Try again.");
    }
  }

  console.log(`\n✅ You selected: Team ${winner}`);
  console.log("Processing economics...\n");

  await matchRef.update({
    status: "finished",
    winner: winner,
    settledAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // --- DIVIDE BETS ---
  const winningBets = allBets.filter((b) => b.team.toString() === winner);
  const losingBets = allBets.filter((b) => b.team.toString() !== winner);

  const W = winningBets.reduce((sum, b) => sum + b.points, 0);
  const L = losingBets.reduce((sum, b) => sum + b.points, 0);

  console.log(
    `   🟢 Total Winning Bets: ${W} pts (${winningBets.length} players)`,
  );
  console.log(
    `   🔴 Total Losing Bets:  ${L} pts (${losingBets.length} players)`,
  );

  let winSharesMap = new Map();
  let refundsMap = new Map();

  // --- SCENARIO HANDLING ---
  if (W === 0) {
    console.log("   ⚠️ No winners. All losing bets will be refunded 100%.");
    losingBets.forEach((b) => refundsMap.set(b.id, b.points));
  } else if (L === 0) {
    console.log(
      "   ⚠️ No losers. All winning bets get their money back (0 profit).",
    );
    winningBets.forEach((b) => winSharesMap.set(b.id, 0));
  } else {
    // 👑 HIGHEST WINNER CAP LOGIC 👑

    // 1. Find the highest bet among the winners
    const maxWinnerBet = Math.max(...winningBets.map((b) => b.points));
    console.log(`   👑 Highest Winner Bet (The Cap): ${maxWinnerBet} pts`);

    let rewardPool = 0;

    // 2. Process Losers: Take up to the Cap, refund the rest
    for (const bet of losingBets) {
      const takenAmount = Math.min(bet.points, maxWinnerBet);
      const refundedAmount = bet.points - takenAmount;

      rewardPool += takenAmount;
      refundsMap.set(bet.id, refundedAmount);
    }

    console.log(`   💰 Reward Pool Collected from Losers: ${rewardPool} pts`);
    console.log(`   💸 Refunded back to Whale Losers: ${L - rewardPool} pts`);

    // 3. Process Winners: Distribute the collected reward pool
    winSharesMap = distributePoints(rewardPool, winningBets);
  }

  // --- EXECUTE TRANSACTIONS ---
  console.log("\n🔄 Updating Database...");

  // Losers processing
  for (const bet of losingBets) {
    const refund = refundsMap.get(bet.id) || 0;
    const netLoss = bet.points - refund;

    await db
      .collection("bets")
      .doc(bet.id)
      .update({
        result: refund === bet.points ? "refunded" : "lost",
        refund: refund,
        netLoss: netLoss,
        settledAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    if (refund > 0) {
      await db
        .collection("users")
        .doc(bet.userId)
        .update({
          points: admin.firestore.FieldValue.increment(refund),
        });
      await db.collection("transactions").add({
        userId: bet.userId,
        type: "bet_refund",
        points: refund,
        matchId,
        betId: bet.id,
        note: "Whale Loser Cap Protection",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Winners processing
  for (const bet of winningBets) {
    const netProfit = winSharesMap.get(bet.id) || 0;
    const totalPayout = bet.points + netProfit; // Original bet returned + profit

    await db
      .collection("bets")
      .doc(bet.id)
      .update({
        result: netProfit === 0 ? "refunded" : "won",
        winnings: totalPayout,
        netProfit: netProfit,
        settledAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await db
      .collection("users")
      .doc(bet.userId)
      .update({
        points: admin.firestore.FieldValue.increment(totalPayout),
      });

    await db.collection("transactions").add({
      userId: bet.userId,
      type: netProfit === 0 ? "bet_refund" : "bet_win",
      points: totalPayout,
      originalBet: bet.points,
      netProfit: netProfit,
      matchId,
      betId: bet.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log("🎉 Settlement complete! Economy balanced perfectly.\n");
  rl.close(); // Close the terminal prompt
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("Usage: node script.js <matchId>");
  process.exit(1);
}

settleMatch(args[0]).catch((err) => {
  console.error(err);
  process.exit(1);
});
