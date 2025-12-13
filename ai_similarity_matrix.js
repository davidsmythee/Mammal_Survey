#!/usr/bin/env node
/**
 * ai_similarity_matrix.js
 * 
 * Creates a similarity matrix for mammals using AI-rated feature weights.
 * Uses weighted city block distance (same formula as human survey).
 * 
 * Distance: d_ij = Σ w_k * |x_ik - x_jk|
 * Similarity: S(i,j) = 1 / (1 + β * d_ij)
 * Beta: β = 1 / mean(d)
 * 
 * Usage: node ai_similarity_matrix.js
 */

const fs = require('fs');
const path = require('path');

// Load mammals_data.js dynamically
const mammalsDataPath = path.join(__dirname, 'mammals_data.js');
let mammalsDataCode = fs.readFileSync(mammalsDataPath, 'utf-8');

// Convert const to var so we can access them after eval
mammalsDataCode = mammalsDataCode.replace(/const /g, 'var ');

// Execute to load the variables into scope
eval(mammalsDataCode);

// Load AI feature weights
const weightsPath = path.join(__dirname, 'ai_feature_weights.json');
if (!fs.existsSync(weightsPath)) {
  console.error('❌ ai_feature_weights.json not found. Run analyze_ai_features.js first.');
  process.exit(1);
}

const weightsData = JSON.parse(fs.readFileSync(weightsPath, 'utf-8'));

console.log('📊 Building AI similarity matrix...\n');
console.log(`   Animals: ${animalNames.length}`);
console.log(`   Features: ${featureNames.length}\n`);

// Build weights array from AI data (normalized values)
const weights = featureNames.map(name => {
  if (weightsData.weights[name]) {
    return weightsData.weights[name].normalized;
  }
  return 0; // Default to 0 if feature not rated
});

console.log(`Step 1: Loaded AI feature weights`);
console.log(`   Min weight: ${Math.min(...weights).toFixed(3)}`);
console.log(`   Max weight: ${Math.max(...weights).toFixed(3)}\n`);

// Step 2: Calculate weighted city block distances
console.log('Step 2: Calculating weighted city block distances...');

const numAnimals = animalNames.length;
const distances = [];

// Initialize distance matrix
for (let i = 0; i < numAnimals; i++) {
  distances[i] = [];
  for (let j = 0; j < numAnimals; j++) {
    distances[i][j] = 0;
  }
}

// Calculate pairwise distances: d_ij = Σ w_k * |x_ik - x_jk|
let sumDistances = 0;
let countDistances = 0;

for (let i = 0; i < numAnimals; i++) {
  for (let j = i + 1; j < numAnimals; j++) {
    let distance = 0;
    
    for (let k = 0; k < featureNames.length; k++) {
      const x_ik = animalFeatures[i][k] ? 1 : 0;
      const x_jk = animalFeatures[j][k] ? 1 : 0;
      distance += weights[k] * Math.abs(x_ik - x_jk);
    }
    
    distances[i][j] = distance;
    distances[j][i] = distance; // Symmetric
    
    sumDistances += distance;
    countDistances++;
  }
}

const meanDistance = sumDistances / countDistances;
console.log(`   Mean distance (d̄): ${meanDistance.toFixed(4)}`);

// Step 3: Calculate beta
const beta = 1 / meanDistance;
console.log(`   Beta (β = 1/d̄): ${beta.toFixed(4)}\n`);

// Step 4: Convert to similarities: S(i,j) = 1 / (1 + β * d_ij)
console.log('Step 3: Converting distances to similarities...');

const similarities = [];
for (let i = 0; i < numAnimals; i++) {
  similarities[i] = [];
  for (let j = 0; j < numAnimals; j++) {
    if (i === j) {
      similarities[i][j] = 1.0; // Self-similarity = 1
    } else {
      similarities[i][j] = 1 / (1 + beta * distances[i][j]);
    }
  }
}

console.log(`   Created ${numAnimals}x${numAnimals} similarity matrix\n`);

// Step 5: Build output object
const output = {
  metadata: {
    created: new Date().toISOString(),
    source: 'AI feature weights',
    num_animals: numAnimals,
    num_features: featureNames.length,
    mean_distance: meanDistance,
    beta: beta,
    formula: {
      distance: "d_ij = Σ w_k * |x_ik - x_jk|",
      similarity: "S(i,j) = 1 / (1 + β * d_ij)",
      beta: "β = 1 / mean(d)"
    }
  },
  animals: animalNames,
  features: featureNames,
  weights: {},
  similarity_matrix: similarities
};

// Add weights as object
featureNames.forEach((name, idx) => {
  output.weights[name] = weights[idx];
});

// Step 6: Save to JSON
const outputPath = path.join(__dirname, 'ai_similarity_matrix.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`✅ Saved to: ${outputPath}\n`);

// Print some example similarities
console.log('═'.repeat(55));
console.log('SAMPLE SIMILARITIES (AI Weights)');
console.log('═'.repeat(55));

// Find top 10 most similar pairs (excluding self)
const pairs = [];
for (let i = 0; i < numAnimals; i++) {
  for (let j = i + 1; j < numAnimals; j++) {
    pairs.push({
      animal1: animalNames[i],
      animal2: animalNames[j],
      similarity: similarities[i][j]
    });
  }
}

pairs.sort((a, b) => b.similarity - a.similarity);

console.log('\nTop 10 most similar pairs:');
pairs.slice(0, 10).forEach((p, idx) => {
  console.log(`  ${idx + 1}. ${p.animal1} ↔ ${p.animal2}: ${p.similarity.toFixed(4)}`);
});

console.log('\nTop 10 least similar pairs:');
pairs.slice(-10).reverse().forEach((p, idx) => {
  console.log(`  ${idx + 1}. ${p.animal1} ↔ ${p.animal2}: ${p.similarity.toFixed(4)}`);
});

