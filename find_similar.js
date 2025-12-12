#!/usr/bin/env node
/**
 * find_similar.js
 * 
 * Find the top 10 most similar animals to a given animal.
 * 
 * Usage: node find_similar.js <animal_name>
 * Example: node find_similar.js "grizzly bear"
 */

const fs = require('fs');
const path = require('path');

// Load the similarity matrix
const matrixPath = path.join(__dirname, 'similarity_matrix.json');

if (!fs.existsSync(matrixPath)) {
  console.error('❌ similarity_matrix.json not found. Run similarity_matrix.js first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
const { animals, similarity_matrix } = data;

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

// Get similarities for this animal
const similarities = similarity_matrix[animalIndex]
  .map((sim, idx) => ({
    animal: animals[idx],
    similarity: sim,
    index: idx
  }))
  .filter(s => s.index !== animalIndex) // Exclude self
  .sort((a, b) => b.similarity - a.similarity);

// Print results
console.log();
console.log('═'.repeat(50));
console.log(`Top 10 animals most similar to: ${animalName.toUpperCase()}`);
console.log('═'.repeat(50));
console.log();

similarities.slice(0, 10).forEach((s, idx) => {
  const bar = '█'.repeat(Math.round(s.similarity * 20));
  const pct = (s.similarity * 100).toFixed(1);
  console.log(`  ${String(idx + 1).padStart(2)}. ${s.animal.padEnd(18)} ${s.similarity.toFixed(4)}  ${bar} (${pct}%)`);
});

console.log();
console.log('─'.repeat(50));
console.log(`Least similar: ${similarities[similarities.length - 1].animal} (${similarities[similarities.length - 1].similarity.toFixed(4)})`);
console.log('─'.repeat(50));

