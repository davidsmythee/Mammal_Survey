#!/usr/bin/env node
/**
 * check_roster.js
 * 
 * Compares roster.txt against Firebase responses to show who has/hasn't
 * completed the survey.
 * 
 * Usage: node check_roster.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase config (same as experiment.js)
const firebaseConfig = {
  apiKey: "AIzaSyAsIeHc3hWx3_qS2bWXvOiJaKR6rmPM9Hw",
  authDomain: "mammalsurvey-69cfa.firebaseapp.com",
  projectId: "mammalsurvey-69cfa",
  storageBucket: "mammalsurvey-69cfa.firebasestorage.app",
  messagingSenderId: "918927677850",
  appId: "1:918927677850:web:684a74b563f19baed80223"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Normalize name for comparison (lowercase, trim whitespace)
function normalizeName(firstName, lastName) {
  return `${firstName} ${lastName}`.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function main() {
  console.log('🔍 Checking survey completion status...\n');

  // 1. Read roster
  const rosterPath = path.join(__dirname, 'roster.txt');
  const rosterContent = fs.readFileSync(rosterPath, 'utf-8');
  const rosterNames = rosterContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  console.log(`📋 Roster has ${rosterNames.length} people\n`);

  // 2. Fetch all responses from Firebase
  const responsesRef = collection(db, 'responses');
  const snapshot = await getDocs(responsesRef);

  const respondents = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const firstName = (data.first_name || '').trim();
    const lastName = (data.last_name || '').trim();
    const timestamp = data.timestamp || 'unknown';
    
    if (firstName || lastName) {
      respondents.push({
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        normalized: normalizeName(firstName, lastName),
        timestamp
      });
    }
  });

  console.log(`📊 Database has ${respondents.length} response(s)\n`);

  // 3. Compare roster against respondents
  const completed = [];
  const notCompleted = [];

  for (const rosterName of rosterNames) {
    const normalizedRoster = rosterName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Find matching respondent
    const match = respondents.find(r => r.normalized === normalizedRoster);
    
    if (match) {
      completed.push({ name: rosterName, timestamp: match.timestamp });
    } else {
      notCompleted.push(rosterName);
    }
  }

  // 4. Check for respondents not on roster
  const notOnRoster = respondents.filter(r => {
    const normalizedRoster = rosterNames.map(n => n.toLowerCase().trim().replace(/\s+/g, ' '));
    return !normalizedRoster.includes(r.normalized);
  });

  // 5. Print results
  console.log('═'.repeat(50));
  console.log(`✅ COMPLETED (${completed.length}/${rosterNames.length})`);
  console.log('═'.repeat(50));
  if (completed.length === 0) {
    console.log('  (none yet)');
  } else {
    completed.forEach(c => {
      const date = new Date(c.timestamp).toLocaleDateString();
      console.log(`  • ${c.name} (${date})`);
    });
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`❌ NOT COMPLETED (${notCompleted.length}/${rosterNames.length})`);
  console.log('═'.repeat(50));
  if (notCompleted.length === 0) {
    console.log('  Everyone has completed the survey! 🎉');
  } else {
    notCompleted.forEach(name => {
      console.log(`  • ${name}`);
    });
  }

  // Show respondents not on roster (if any)
  if (notOnRoster.length > 0) {
    console.log('\n' + '═'.repeat(50));
    console.log(`⚠️  RESPONDED BUT NOT ON ROSTER (${notOnRoster.length})`);
    console.log('═'.repeat(50));
    notOnRoster.forEach(r => {
      console.log(`  • ${r.fullName} (${r.timestamp})`);
    });
  }

  // Summary
  const pct = ((completed.length / rosterNames.length) * 100).toFixed(1);
  console.log('\n' + '─'.repeat(50));
  console.log(`📈 Completion rate: ${completed.length}/${rosterNames.length} (${pct}%)`);
  console.log('─'.repeat(50));

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

