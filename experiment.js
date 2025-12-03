// Survey: 5 animals × 10 features each
// For each animal: 1 intro page + 1 page with 10 feature questions



const firebaseConfig = {
  apiKey: "AIzaSyAsIeHc3hWx3_qS2bWXvOiJaKR6rmPM9Hw",
  authDomain: "mammalsurvey-69cfa.firebaseapp.com",
  projectId: "mammalsurvey-69cfa",
  storageBucket: "mammalsurvey-69cfa.firebasestorage.app",
  messagingSenderId: "918927677850",
  appId: "1:918927677850:web:684a74b563f19baed80223"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();



const jsPsych = initJsPsych({
  display_element: 'jspsych-target',
  on_finish: async function() {
    const data = jsPsych.data.get().json();

    await addDoc(collection(db, "responses"), {
      timestamp: new Date(),
      data: data
    });

    alert("Thank you! Your responses were saved.");
  }
});


// 1. Intro screen (experiment-level)
const welcome = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <h2>Feature Importance Survey</h2>
    <p>You will rate how important different features are for describing different animals.</p>
    <p>For each question, use the 1–5 scale where 1 = "Not important" and 5 = "Very important".</p>
    <p>Click "Begin" to start.</p>
  `,
  choices: ['Begin'],
  data: {
    screen_type: 'experiment_intro'
  }
};

// ---------- Build the 5 animals × 10 features design ----------

// Choose animals that have at least 10 features present
let candidateAnimals = [];
for (let i = 0; i < animalNames.length; i++) {
  const row = animalFeatures[i];  // booleans for this animal
  const countTrue = row.filter(v => v).length;
  if (countTrue >= 10) {
    candidateAnimals.push(i);
  }
}

console.log("Number of candidate animals with ≥10 features:", candidateAnimals.length);

// Sample 5 animals from candidates (per participant)
let sampledAnimals = jsPsych.randomization.sampleWithoutReplacement(candidateAnimals, 5);
console.log("Sampled animal indices:", sampledAnimals);

// Build timeline
let timeline = [];
timeline.push(welcome);

// For each sampled animal:
//   1) an intro page about that animal
//   2) ONE survey-likert page with 10 feature questions
sampledAnimals.forEach(animalIdx => {
  const animalName = animalNames[animalIdx];
  const row = animalFeatures[animalIdx];

  // --- 1) Intro page for this animal ---
  const animalIntro = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <h2>${animalName}</h2>
      <p>Next, you will answer 10 questions about how important different features are
      for describing a <b>${animalName}</b>.</p>
      <p>All 10 questions will appear on the same page.</p>
    `,
    choices: ['Continue'],
    data: {
      screen_type: 'animal_intro',
      animal: animalName,
      animal_index: animalIdx
    }
  };

  timeline.push(animalIntro);

  // --- 2) Select 10 present features for this animal ---
  let presentFeatureIndices = [];
  for (let j = 0; j < featureNames.length; j++) {
    if (row[j]) {
      presentFeatureIndices.push(j);
    }
  }

  const sampledFeatureIndices = jsPsych.randomization.sampleWithoutReplacement(
    presentFeatureIndices,
    10
  );

  // Build the 10 questions for this animal (all on one page)
  const questions = sampledFeatureIndices.map((featureIdx, qIdx) => {
    const featureName = featureNames[featureIdx];

    // Default numeric labels
    let labels = ['1', '2', '3', '4', '5'];

    // For the FIRST slider on the page, add "Not important" / "Very important" text
    if (qIdx === 0) {
      labels = [
        '1<br><span style="font-size: 12px;">Not important</span>',
        '2',
        '3',
        '4',
        '5<br><span style="font-size: 12px;">Very important</span>'
      ];
    }

    return {
      prompt: `How important is <b>${featureName}</b> for being a <b>${animalName}</b>?`,
      labels: labels,
      required: true,
      // Name encodes the feature index, so you can decode later
      name: `feature_${featureIdx}`
    };
  });

  const featurePage = {
    type: jsPsychSurveyLikert,
    preamble: `<p>Animal: <b>${animalName}</b></p>
               <p>Please answer all 10 questions about this animal before continuing.</p>`,
    questions: questions,
    data: {
      screen_type: 'feature_block',
      animal: animalName,
      animal_index: animalIdx,
      feature_indices: sampledFeatureIndices  // we can unpack this later
    }
  };

  timeline.push(featurePage);
});

// Outro screen
const goodbye = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <h2>Thank you!</h2>
    <p>Your responses have been recorded.</p>
  `,
  choices: ['Finish'],
  data: {
    screen_type: 'goodbye'
  }
};

timeline.push(goodbye);

// Run experiment
jsPsych.run(timeline);
