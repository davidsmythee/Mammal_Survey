#!/usr/bin/env node
/**
 * analyze_features.js
 * 
 * Calculates average scores for each feature across all responses.
 * 
 * Usage: node analyze_features.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase config (same as experiment.js)
const firebaseConfig = {
  apiKey: "AIzaSyAsIeHc3hWx3_qS2bWXvOiJaKR6rmPM9Hw",
  authDomain: "mammalsurvey-69cfa.firebaseapp.com",
  projectId: "mammalsurvey-69cfa",
  storageBucket: "mammalsurvey-69cfa.firebasestorage.app",
  messagingSenderId: "918927677850",
  appId: "1:918927677850:web:684a74b563f19baed80223"
};

// Feature names from the survey
const featureNames = ["black", "white", "blue", "brown", "gray", "orange", "red", "yellow", "patches", "spots", "stripes", "furry", "hairless", "toughskin", "big", "small", "bulbous", "lean", "flippers", "hands", "hooves", "pads", "paws", "longleg", "longneck", "tail", "chewteeth", "meatteeth", "buckteeth", "strainteeth", "horns", "claws", "tusks", "smelly", "flys", "hops", "swims", "tunnels", "walks", "fast", "slow", "strong", "weak", "muscle", "bipedal", "quadrapedal", "active", "inactive", "nocturnal", "hibernate", "agility", "fish", "meat", "plankton", "vegetation", "insects", "forager", "grazer", "hunter", "scavenger", "skimmer", "stalker", "newworld", "oldworld", "arctic", "coastal", "desert", "bush", "plains", "forest", "fields", "jungle", "mountains", "ocean", "ground", "water", "tree", "cave", "fierce", "timid", "smart", "group", "solitary", "nestspot", "domestic"];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('📊 Analyzing feature scores...\n');

  // Fetch all responses from Firebase
  const responsesRef = collection(db, 'responses');
  const snapshot = await getDocs(responsesRef);

  // Accumulate scores per feature
  // { featureName: { sum: X, count: Y } }
  const featureStats = {};

  // Initialize all features
  featureNames.forEach(name => {
    featureStats[name] = { sum: 0, count: 0 };
  });

  let totalRatings = 0;
  let totalParticipants = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const responses = data.responses || [];
    
    if (responses.length > 0) {
      totalParticipants++;
    }

    responses.forEach(r => {
      const featureName = r.feature_name;
      const score = r.score; // 1-5

      if (featureName && featureStats[featureName] !== undefined && score >= 1 && score <= 5) {
        featureStats[featureName].sum += score;
        featureStats[featureName].count += 1;
        totalRatings++;
      }
    });
  });

  console.log(`👥 Participants: ${totalParticipants}`);
  console.log(`📝 Total ratings: ${totalRatings}\n`);

  // Calculate averages
  const results = featureNames
    .map(name => ({
      feature: name,
      avg: featureStats[name].count > 0 
        ? featureStats[name].sum / featureStats[name].count 
        : 0,
      n: featureStats[name].count
    }))
    .filter(r => r.n > 0); // Only include features that were rated

  // Find min and max for normalization
  const minAvg = Math.min(...results.map(r => r.avg));
  const maxAvg = Math.max(...results.map(r => r.avg));
  const range = maxAvg - minAvg;

  console.log(`📈 Min avg: ${minAvg.toFixed(2)}, Max avg: ${maxAvg.toFixed(2)}\n`);

  // Add normalized scores and sort
  results.forEach(r => {
    r.normalized = range > 0 ? (r.avg - minAvg) / range : 0;
  });
  results.sort((a, b) => b.avg - a.avg); // Sort highest to lowest

  // Print results
  console.log('═'.repeat(65));
  console.log('FEATURE IMPORTANCE RANKINGS (Highest to Lowest)');
  console.log('═'.repeat(65));
  console.log('Rank  Feature              Avg Score   Normalized    Sample Size');
  console.log('─'.repeat(65));

  results.forEach((r, idx) => {
    const rank = String(idx + 1).padStart(2, ' ');
    const feature = r.feature.padEnd(20, ' ');
    const avg = r.avg.toFixed(2).padStart(5, ' ');
    const norm = r.normalized.toFixed(3).padStart(6, ' ');
    const n = `(n=${r.n})`.padStart(10, ' ');
    console.log(`${rank}.   ${feature} ${avg}       ${norm}        ${n}`);
  });

  console.log('─'.repeat(55));
  console.log(`\nTotal features rated: ${results.length}/${featureNames.length}`);
  
  // Features not rated
  const notRated = featureNames.filter(name => featureStats[name].count === 0);
  if (notRated.length > 0) {
    console.log(`\n⚠️  Features with no ratings: ${notRated.join(', ')}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

