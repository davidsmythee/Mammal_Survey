#!/usr/bin/env node
/**
 * feature_ratio_similarity_matrix.js
 * 
 * Creates a similarity matrix using feature-based conception of similarity.
 * 
 * S(m1, m2) = # of shared features / # of differed features
 * 
 * Where:
 *   - Shared features: features both animals possess (both = 1)
 *   - Differed features: features where they differ (one = 1, other = 0)
 * 
 * Usage: node feature_ratio_similarity_matrix.js
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

console.log('📊 Building FEATURE RATIO similarity matrix...\n');
console.log(`   Animals: ${animalNames.length}`);
console.log(`   Features: ${featureNames.length}`);
console.log(`   Formula: S(m1, m2) = shared / differed\n`);

const numAnimals = animalNames.length;

// Step 1: Calculate feature-based similarity
console.log('Step 1: Calculating feature-based similarities...');

const similarities = [];

for (let i = 0; i < numAnimals; i++) {
  similarities[i] = [];
  for (let j = 0; j < numAnimals; j++) {
    if (i === j) {
      similarities[i][j] = 1.0; // Self-similarity = 1
    } else {
      let shared = 0;   // Both animals have the feature (1 AND 1)
      let differed = 0; // They differ on this feature (1 XOR 0)
      
      for (let k = 0; k < featureNames.length; k++) {
        const x_ik = animalFeatures[i][k] ? 1 : 0;
        const x_jk = animalFeatures[j][k] ? 1 : 0;
        
        if (x_ik === 1 && x_jk === 1) {
          shared++;
        } else if (x_ik !== x_jk) {
          differed++;
        }
        // If both are 0, it's neither shared nor differed
      }
      
      // Calculate similarity: shared / differed
      // Handle division by zero (if differed = 0, they're identical on all features they have)
      if (differed === 0) {
        similarities[i][j] = shared > 0 ? 10.0 : 0; // Max similarity if no differences
      } else {
        similarities[i][j] = shared / differed;
      }
    }
  }
}

// Find min and max for normalization
let minSim = Infinity;
let maxSim = -Infinity;
for (let i = 0; i < numAnimals; i++) {
  for (let j = 0; j < numAnimals; j++) {
    if (i !== j) {
      minSim = Math.min(minSim, similarities[i][j]);
      maxSim = Math.max(maxSim, similarities[i][j]);
    }
  }
}

console.log(`   Raw similarity range: ${minSim.toFixed(4)} to ${maxSim.toFixed(4)}`);

// Step 2: Normalize to 0-1 range for comparability
console.log('\nStep 2: Normalizing similarities to 0-1 range...');

const normalizedSimilarities = [];
const range = maxSim - minSim;

for (let i = 0; i < numAnimals; i++) {
  normalizedSimilarities[i] = [];
  for (let j = 0; j < numAnimals; j++) {
    if (i === j) {
      normalizedSimilarities[i][j] = 1.0;
    } else {
      normalizedSimilarities[i][j] = (similarities[i][j] - minSim) / range;
    }
  }
}

console.log(`   Created ${numAnimals}x${numAnimals} similarity matrix\n`);

// Step 3: Build output object
const output = {
  metadata: {
    created: new Date().toISOString(),
    source: 'Feature ratio (shared/differed)',
    num_animals: numAnimals,
    num_features: featureNames.length,
    raw_min: minSim,
    raw_max: maxSim,
    formula: {
      similarity: "S(m1, m2) = shared_features / differed_features",
      shared: "features where both animals = 1",
      differed: "features where animals differ (one=1, other=0)",
      normalized: "(raw - min) / (max - min)"
    }
  },
  animals: animalNames,
  features: featureNames,
  similarity_matrix: normalizedSimilarities,
  raw_similarity_matrix: similarities
};

// Step 4: Save to JSON
const outputPath = path.join(__dirname, 'feature_ratio_similarity_matrix.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`✅ Saved to: ${outputPath}\n`);

// Print some example similarities
console.log('═'.repeat(55));
console.log('SAMPLE SIMILARITIES (Feature Ratio - Normalized)');
console.log('═'.repeat(55));

// Find top 10 most similar pairs (excluding self)
const pairs = [];
for (let i = 0; i < numAnimals; i++) {
  for (let j = i + 1; j < numAnimals; j++) {
    pairs.push({
      animal1: animalNames[i],
      animal2: animalNames[j],
      similarity: normalizedSimilarities[i][j],
      raw: similarities[i][j]
    });
  }
}

pairs.sort((a, b) => b.similarity - a.similarity);

console.log('\nTop 10 most similar pairs:');
pairs.slice(0, 10).forEach((p, idx) => {
  console.log(`  ${idx + 1}. ${p.animal1} ↔ ${p.animal2}: ${p.similarity.toFixed(4)} (raw: ${p.raw.toFixed(3)})`);
});

console.log('\nTop 10 least similar pairs:');
pairs.slice(-10).reverse().forEach((p, idx) => {
  console.log(`  ${idx + 1}. ${p.animal1} ↔ ${p.animal2}: ${p.similarity.toFixed(4)} (raw: ${p.raw.toFixed(3)})`);
});

