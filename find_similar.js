#!/usr/bin/env node
/**
 * find_similar.js
 * 
 * Find the top 10 most similar animals to a given animal.
 * Compares 4 similarity matrices side by side:
 *   - Human-weighted
 *   - AI-weighted
 *   - Unweighted
 *   - Feature Ratio (shared/differed)
 * 
 * Usage: node find_similar.js <animal_name>
 * Example: node find_similar.js "grizzly bear"
 */

const fs = require('fs');
const path = require('path');

// Load all four similarity matrices
const humanMatrixPath = path.join(__dirname, 'similarity_matrix.json');
const aiMatrixPath = path.join(__dirname, 'ai_similarity_matrix.json');
const unweightedMatrixPath = path.join(__dirname, 'unweighted_similarity_matrix.json');
const featureRatioMatrixPath = path.join(__dirname, 'feature_ratio_similarity_matrix.json');

if (!fs.existsSync(humanMatrixPath)) {
  console.error('❌ similarity_matrix.json not found. Run similarity_matrix.js first.');
  process.exit(1);
}

if (!fs.existsSync(aiMatrixPath)) {
  console.error('❌ ai_similarity_matrix.json not found. Run ai_similarity_matrix.js first.');
  process.exit(1);
}

if (!fs.existsSync(unweightedMatrixPath)) {
  console.error('❌ unweighted_similarity_matrix.json not found. Run unweighted_similarity_matrix.js first.');
  process.exit(1);
}

if (!fs.existsSync(featureRatioMatrixPath)) {
  console.error('❌ feature_ratio_similarity_matrix.json not found. Run feature_ratio_similarity_matrix.js first.');
  process.exit(1);
}

const humanData = JSON.parse(fs.readFileSync(humanMatrixPath, 'utf-8'));
const aiData = JSON.parse(fs.readFileSync(aiMatrixPath, 'utf-8'));
const unweightedData = JSON.parse(fs.readFileSync(unweightedMatrixPath, 'utf-8'));
const featureRatioData = JSON.parse(fs.readFileSync(featureRatioMatrixPath, 'utf-8'));

const animals = humanData.animals;
const humanMatrix = humanData.similarity_matrix;
const aiMatrix = aiData.similarity_matrix;
const unweightedMatrix = unweightedData.similarity_matrix;
const featureRatioMatrix = featureRatioData.similarity_matrix;

// Get the animal name from command line
const input = process.argv.slice(2).join(' ').toLowerCase().trim();

if (!input) {
  console.log('Usage: node find_similar.js <animal_name>');
  console.log('\nAvailable animals:');
  animals.forEach((a, i) => {
    if (i % 5 === 0) process.stdout.write('  ');
    process.stdout.write(a.padEnd(18));
    if ((i + 1) % 5 === 0) console.log();
  });
  console.log();
  process.exit(0);
}

// Find the animal index (fuzzy match)
let animalIndex = animals.findIndex(a => a.toLowerCase() === input);

// If exact match not found, try partial match
if (animalIndex === -1) {
  animalIndex = animals.findIndex(a => a.toLowerCase().includes(input));
}

if (animalIndex === -1) {
  console.error(`❌ Animal "${input}" not found.`);
  console.log('\nDid you mean one of these?');
  animals
    .filter(a => a.toLowerCase().includes(input.split(' ')[0]))
    .slice(0, 5)
    .forEach(a => console.log(`  • ${a}`));
  process.exit(1);
}

const animalName = animals[animalIndex];

// Helper function to get sorted similarities
function getSimilarities(matrix) {
  return matrix[animalIndex]
    .map((sim, idx) => ({
      animal: animals[idx],
      similarity: sim,
      index: idx
    }))
    .filter(s => s.index !== animalIndex)
    .sort((a, b) => b.similarity - a.similarity);
}

const humanSimilarities = getSimilarities(humanMatrix);
const aiSimilarities = getSimilarities(aiMatrix);
const unweightedSimilarities = getSimilarities(unweightedMatrix);
const featureRatioSimilarities = getSimilarities(featureRatioMatrix);

// Print results - two rows of two columns each for better readability
console.log();
console.log('═'.repeat(100));
console.log(`Top 10 animals most similar to: ${animalName.toUpperCase()}`);
console.log('═'.repeat(100));

// First row: Human Weights and AI Weights
console.log();
console.log('        HUMAN WEIGHTS                                    AI WEIGHTS');
console.log('     ──────────────────────────────────────         ──────────────────────────────────────');

for (let i = 0; i < 10; i++) {
  const h = humanSimilarities[i];
  const a = aiSimilarities[i];
  
  const rank = String(i + 1).padStart(2);
  
  const hName = h.animal.padEnd(16);
  const hScore = h.similarity.toFixed(3);
  const hBar = '█'.repeat(Math.round(h.similarity * 10)).padEnd(10);
  
  const aName = a.animal.padEnd(16);
  const aScore = a.similarity.toFixed(3);
  const aBar = '█'.repeat(Math.round(a.similarity * 10)).padEnd(10);
  
  console.log(`  ${rank}. ${hName} ${hScore} ${hBar}      ${rank}. ${aName} ${aScore} ${aBar}`);
}

// Second row: Unweighted and Feature Ratio
console.log();
console.log('        UNWEIGHTED                                       FEATURE RATIO (shared/differed)');
console.log('     ──────────────────────────────────────         ──────────────────────────────────────');

for (let i = 0; i < 10; i++) {
  const u = unweightedSimilarities[i];
  const f = featureRatioSimilarities[i];
  
  const rank = String(i + 1).padStart(2);
  
  const uName = u.animal.padEnd(16);
  const uScore = u.similarity.toFixed(3);
  const uBar = '█'.repeat(Math.round(u.similarity * 10)).padEnd(10);
  
  const fName = f.animal.padEnd(16);
  const fScore = f.similarity.toFixed(3);
  const fBar = '█'.repeat(Math.round(f.similarity * 10)).padEnd(10);
  
  console.log(`  ${rank}. ${uName} ${uScore} ${uBar}      ${rank}. ${fName} ${fScore} ${fBar}`);
}

console.log();
console.log('─'.repeat(100));

// Show agreement/disagreement
const humanTop10 = new Set(humanSimilarities.slice(0, 10).map(s => s.animal));
const aiTop10 = new Set(aiSimilarities.slice(0, 10).map(s => s.animal));
const unweightedTop10 = new Set(unweightedSimilarities.slice(0, 10).map(s => s.animal));
const featureRatioTop10 = new Set(featureRatioSimilarities.slice(0, 10).map(s => s.animal));

// Find animals in all four
const inAll4 = [...humanTop10].filter(a => aiTop10.has(a) && unweightedTop10.has(a) && featureRatioTop10.has(a));

// Find pairwise overlaps
const humanAiOverlap = [...humanTop10].filter(a => aiTop10.has(a));
const humanUnweightedOverlap = [...humanTop10].filter(a => unweightedTop10.has(a));
const humanFeatureRatioOverlap = [...humanTop10].filter(a => featureRatioTop10.has(a));

console.log(`Agreement across all 4 methods: ${inAll4.length}/10`);
console.log(`  Human ∩ AI: ${humanAiOverlap.length}/10  |  Human ∩ Unweighted: ${humanUnweightedOverlap.length}/10  |  Human ∩ FeatureRatio: ${humanFeatureRatioOverlap.length}/10`);

// Show unique to each method
const humanOnly = [...humanTop10].filter(a => !aiTop10.has(a) && !unweightedTop10.has(a) && !featureRatioTop10.has(a));
const aiOnly = [...aiTop10].filter(a => !humanTop10.has(a) && !unweightedTop10.has(a) && !featureRatioTop10.has(a));
const unweightedOnly = [...unweightedTop10].filter(a => !humanTop10.has(a) && !aiTop10.has(a) && !featureRatioTop10.has(a));
const featureRatioOnly = [...featureRatioTop10].filter(a => !humanTop10.has(a) && !aiTop10.has(a) && !unweightedTop10.has(a));

if (humanOnly.length > 0 || aiOnly.length > 0 || unweightedOnly.length > 0 || featureRatioOnly.length > 0) {
  console.log();
  if (humanOnly.length > 0) console.log(`  Unique to Human: ${humanOnly.join(', ')}`);
  if (aiOnly.length > 0) console.log(`  Unique to AI: ${aiOnly.join(', ')}`);
  if (unweightedOnly.length > 0) console.log(`  Unique to Unweighted: ${unweightedOnly.join(', ')}`);
  if (featureRatioOnly.length > 0) console.log(`  Unique to FeatureRatio: ${featureRatioOnly.join(', ')}`);
}

console.log('─'.repeat(100));
