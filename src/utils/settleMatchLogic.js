import { writeBatch, doc, collection, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

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

// ─── MAIN SETTLEMENT CLIENT LOGIC ────────────────────────────────

export async function settleMatchClient(matchId, winnerTeamStr, allBets) {
  if (!matchId) throw new Error("Match ID required");
  
  // Convert winnerTeamStr to string to match bet.team which might be numbers or strings
  const winner = winnerTeamStr ? winnerTeamStr.toString() : null;

  const winningBets = [];
  const losingBets = [];

  // Group bets
  allBets.forEach(b => {
      // Handle the "Refund All" scenario which happens when winner is null or "refund"
      if (!winner || winner === "refund" || winner === "0") {
          losingBets.push(b); // Treating them as losing so they get refunded
      } else if (b.team.toString() === winner) {
          winningBets.push(b);
      } else {
          losingBets.push(b);
      }
  });

  const W = winningBets.reduce((sum, b) => sum + b.points, 0);
  const L = losingBets.reduce((sum, b) => sum + b.points, 0);

  let winSharesMap = new Map();
  let refundsMap = new Map();

  // Refund All Scenario (winner "0" or "refund")
  if (!winner || winner === "refund" || winner === "0") {
      allBets.forEach((b) => refundsMap.set(b.id, b.points));
      // Empty the explicitly grouped arrays to avoid double processing if needed
      winningBets.length = 0;
      losingBets.length = 0;
      allBets.forEach(b => losingBets.push(b));
  } else if (W === 0) {
    // No winners. All losing bets will be refunded 100%.
    losingBets.forEach((b) => refundsMap.set(b.id, b.points));
  } else if (L === 0) {
    // No losers. All winning bets get their money back (0 profit).
    winningBets.forEach((b) => winSharesMap.set(b.id, 0));
  } else {
    // 👑 HIGHEST WINNER CAP LOGIC 👑
    const maxWinnerBet = Math.max(...winningBets.map((b) => b.points));

    let rewardPool = 0;
    // Process Losers: Take up to the Cap, refund the rest
    for (const bet of losingBets) {
      const takenAmount = Math.min(bet.points, maxWinnerBet);
      const refundedAmount = bet.points - takenAmount;
      rewardPool += takenAmount;
      refundsMap.set(bet.id, refundedAmount);
    }

    // Process Winners: Distribute the collected reward pool
    winSharesMap = distributePoints(rewardPool, winningBets);
  }

  // --- BEGIN BATCH WRITE ---
  // The Firebase client SDK writeBatch limits to 500 operations per batch.
  // One bet takes at most 3 operations (bet update, user update, transaction insert).
  // Plus 1 match update. 
  // For small to medium apps (< 100 bets), 1 batch is enough. 
  // Standardizing to use chunked array if needed, but for simplicity we will assume < 150 bets.
  const batch = writeBatch(db);

  // 1. Update Match
  const matchRef = doc(db, "matches", matchId);
  if (!winner || winner === "refund" || winner === "0") {
     batch.update(matchRef, {
        status: "finished",
        winner: "refunded",
        settledAt: serverTimestamp(),
     });
  } else {
    batch.update(matchRef, {
        status: "finished",
        winner: winner,
        settledAt: serverTimestamp(),
    });
  }

  // 2. Process Losers
  for (const bet of losingBets) {
    const refund = refundsMap.get(bet.id) || 0;
    const netLoss = bet.points - refund;
    // Update Bet
    batch.update(doc(db, "bets", bet.id), {
      result: refund === bet.points ? "refunded" : "lost",
      refund: refund,
      netLoss: netLoss,
      settledAt: serverTimestamp(),
    });

    if (refund > 0) {
      // Update User Points
      batch.update(doc(db, "users", bet.userId), {
        points: increment(refund),
      });
      // Add Transaction
      const txRef = doc(collection(db, "transactions"));
      batch.set(txRef, {
        userId: bet.userId,
        type: "bet_refund",
        points: refund,
        matchId,
        betId: bet.id,
        note: (!winner || winner === "refund" || winner === "0" || W === 0) ? "Full Match Refund" : "Whale Loser Cap Protection",
        createdAt: serverTimestamp(),
      });
    }
  }

  // 3. Process Winners
  for (const bet of winningBets) {
    const netProfit = winSharesMap.get(bet.id) || 0;
    const totalPayout = bet.points + netProfit; 

    batch.update(doc(db, "bets", bet.id), {
      result: netProfit === 0 ? "refunded" : "won",
      winnings: totalPayout,
      netProfit: netProfit,
      settledAt: serverTimestamp(),
    });

    batch.update(doc(db, "users", bet.userId), {
      points: increment(totalPayout),
    });

    const txRef = doc(collection(db, "transactions"));
    batch.set(txRef, {
      userId: bet.userId,
      type: netProfit === 0 ? "bet_refund" : "bet_win",
      points: totalPayout,
      originalBet: bet.points,
      netProfit: netProfit,
      matchId,
      betId: bet.id,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}
