#!/usr/bin/env node
/**
 * analyze_ai_features.js
 * 
 * Calculates average scores for each feature from AI responses.
 * Uses min-max normalization (same as human survey analysis).
 * 
 * Usage: node analyze_ai_features.js
 */

const fs = require('fs');
const path = require('path');

// Feature names (for reference)
const featureNames = ["black", "white", "blue", "brown", "gray", "orange", "red", "yellow", "patches", "spots", "stripes", "furry", "hairless", "toughskin", "big", "small", "bulbous", "lean", "flippers", "hands", "hooves", "pads", "paws", "longleg", "longneck", "tail", "chewteeth", "meatteeth", "buckteeth", "strainteeth", "horns", "claws", "tusks", "smelly", "flys", "hops", "swims", "tunnels", "walks", "fast", "slow", "strong", "weak", "muscle", "bipedal", "quadrapedal", "active", "inactive", "nocturnal", "hibernate", "agility", "fish", "meat", "plankton", "vegetation", "insects", "forager", "grazer", "hunter", "scavenger", "skimmer", "stalker", "newworld", "oldworld", "arctic", "coastal", "desert", "bush", "plains", "forest", "fields", "jungle", "mountains", "ocean", "ground", "water", "tree", "cave", "fierce", "timid", "smart", "group", "solitary", "nestspot", "domestic"];

// Load AI feature scores
const dataPath = path.join(__dirname, 'ai_feature_scores.json');
if (!fs.existsSync(dataPath)) {
  console.error('❌ ai_feature_scores.json not found.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('📊 Analyzing AI feature scores...\n');
console.log(`📝 Total responses: ${data.length}\n`);

// Accumulate scores per feature
const featureStats = {};

data.forEach(entry => {
  const ratings = entry.ratings || {};
  
  for (const [feature, score] of Object.entries(ratings)) {
    if (!featureStats[feature]) {
      featureStats[feature] = { sum: 0, count: 0 };
    }
    if (score >= 1 && score <= 5) {
      featureStats[feature].sum += score;
      featureStats[feature].count += 1;
    }
  }
});

// Calculate averages
const results = Object.entries(featureStats)
  .map(([feature, stats]) => ({
    feature,
    avg: stats.count > 0 ? stats.sum / stats.count : 0,
    n: stats.count
  }))
  .filter(r => r.n > 0);

// Find min and max for normalization
const minAvg = Math.min(...results.map(r => r.avg));
const maxAvg = Math.max(...results.map(r => r.avg));
const range = maxAvg - minAvg;

console.log(`📈 Min avg: ${minAvg.toFixed(2)}, Max avg: ${maxAvg.toFixed(2)}\n`);

// Add normalized scores and sort
results.forEach(r => {
  r.normalized = range > 0 ? (r.avg - minAvg) / range : 0;
});
results.sort((a, b) => b.avg - a.avg);

// Print results
console.log('═'.repeat(65));
console.log('AI FEATURE IMPORTANCE RANKINGS (Highest to Lowest)');
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

console.log('─'.repeat(65));
console.log(`\nTotal features rated: ${results.length}/${featureNames.length}`);

// Features not rated
const ratedFeatures = new Set(results.map(r => r.feature));
const notRated = featureNames.filter(name => !ratedFeatures.has(name));
if (notRated.length > 0) {
  console.log(`\n⚠️  Features with no AI ratings: ${notRated.join(', ')}`);
}

// Save to JSON
const output = {
  metadata: {
    created: new Date().toISOString(),
    source: 'ai_feature_scores.json',
    num_responses: data.length,
    num_features: results.length,
    min_avg: minAvg,
    max_avg: maxAvg
  },
  weights: {}
};

results.forEach(r => {
  output.weights[r.feature] = {
    avg: r.avg,
    normalized: r.normalized,
    n: r.n
  };
});

const outputPath = path.join(__dirname, 'ai_feature_weights.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\n✅ Saved weights to: ${outputPath}`);

