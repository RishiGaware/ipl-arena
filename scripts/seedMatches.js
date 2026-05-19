import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

// ─── Initialize Firebase Admin SDK ──────────────────────────────
const serviceAccountPath = resolve(ROOT, "serviceAccountKey.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── Load matches JSON ───────────────────────────────────────────
const matchesPath = resolve(ROOT, "src", "data", "matches.json");
const matchesRaw = readFileSync(matchesPath, "utf-8");
const matches = JSON.parse(matchesRaw);

// ─── Clear existing matches (optional) ──────────────────────────
async function clearMatches() {
  console.log("🗑️  Clearing existing matches...");
  const snapshot = await db.collection("matches").get();

  if (snapshot.empty) {
    console.log("   Collection is already empty.");
    return;
  }

  let count = 0;
  for (const docSnap of snapshot.docs) {
    await db.collection("matches").doc(docSnap.id).delete();
    count++;
  }
  console.log(`   Deleted ${count} existing match(es).`);
}

// ─── Seed matches ────────────────────────────────────────────────
async function seedMatches() {
  console.log(`\n🏏 Fetching existing matches...\n`);
  const existingSnap = await db.collection("matches").get();
  const existingMatches = [];
  existingSnap.forEach((d) => existingMatches.push(d.data()));

  console.log(`🏏 Seeding ${matches.length} matches into Firestore...\n`);

  const now = admin.firestore.Timestamp.now();
  let addedCount = 0;

  for (const match of matches) {
    // 🛠️ FIX: Replace 'Z' (UTC) with '+05:30' (IST) before parsing the date
    const correctTimeStr = match.matchStartTime.replace("Z", "+05:30");

    const matchTime = admin.firestore.Timestamp.fromDate(
      new Date(correctTimeStr),
    );

    // Check if match already exists
    const exists = existingMatches.some(
      (em) =>
        em.teamA === match.teamA &&
        em.teamB === match.teamB &&
        // Added ? (optional chaining) to prevent crashes if old data has missing timestamps
        em.matchStartTime?.toMillis() === matchTime.toMillis(),
    );

    if (exists) {
      console.log(
        `   ⏭️  Skipping (already exists): ${match.teamA} vs ${match.teamB}`,
      );
      continue;
    }

    const matchDoc = {
      teamA: match.teamA,
      teamB: match.teamB,
      venue: match.venue,
      matchStartTime: matchTime,
      status: "upcoming",
      winner: null,
      createdAt: now,
    };

    const docRef = await db.collection("matches").add(matchDoc);
    console.log(`   ✅ ${match.teamA} vs ${match.teamB} → ${docRef.id}`);
    addedCount++;
  }

  console.log(`\n🎉 Successfully seeded ${addedCount} new matches!\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");

  console.log("━".repeat(50));
  console.log("  🏟️  IPL Match Seeder (Admin SDK)");
  console.log("━".repeat(50));

  if (shouldClear) await clearMatches();
  await seedMatches();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
