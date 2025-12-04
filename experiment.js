// ---------- Firebase init (compat style) ----------
// If you already initialize Firebase elsewhere, keep ONE copy of this config.

const firebaseConfig = {
  apiKey: "AIzaSyAsIeHc3hWx3_qS2bWXvOiJaKR6rmPM9Hw",
  authDomain: "mammalsurvey-69cfa.firebaseapp.com",
  projectId: "mammalsurvey-69cfa",
  storageBucket: "mammalsurvey-69cfa.firebasestorage.app",
  messagingSenderId: "918927677850",
  appId: "1:918927677850:web:684a74b563f19baed80223"
};

// `firebase` comes from the compat scripts in index.html
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ---------- jsPsych init with custom saving ----------

const jsPsych = initJsPsych({
  display_element: 'jspsych-target',
  on_finish: function() {
    // 1. Get all jsPsych data as an object (not a big JSON string)
    const allData = jsPsych.data.get();

    // 2. Extract demographics
    const demoTrial = allData.filter({ screen_type: 'demographics' }).values()[0];
    const demoResp = demoTrial ? demoTrial.response : {};

    const firstName = demoResp.first_name || "";
    const lastName  = demoResp.last_name || "";
    const age       = demoResp.age || "";
    const gender    = demoResp.gender || "";

    // 3. Extract feature-block trials (each is one animal with 10 features)
    const featureTrials = allData.filter({ screen_type: 'feature_block' }).values();

    // We will build an array of { animal, feature_index, feature_name, score }
    const simplifiedResponses = [];

    featureTrials.forEach(trial => {
      const animal = trial.animal;
      const featureIndices = trial.feature_indices;  // [38, 79, ...]
      const respObj = trial.response;                // { feature_38: 2, ... } (0–4)
      // question_order is there too, but we don't need it since we know feature_indices

      featureIndices.forEach(featureIdx => {
        const key = `feature_${featureIdx}`;
        if (respObj.hasOwnProperty(key)) {
          const rawScore = respObj[key]; // 0–4 from jsPsych
          const score = rawScore + 1;    // convert to 1–5

          simplifiedResponses.push({
            animal: animal,
            feature_index: featureIdx,
            feature_name: featureNames[featureIdx],
            score: score
          });
        }
      });
    });

    // 4. Save ONE document per participant to Firestore
    db.collection("responses").add({
      timestamp: new Date().toISOString(),
      first_name: firstName,
      last_name: lastName,
      responses: simplifiedResponses
    }).then(() => {
      alert("Thank you! Your responses were saved.");
    }).catch((error) => {
      console.error("Error saving data:", error);
      alert("There was an error saving your responses. Please screenshot this and send it to the researcher.");
    });
  }
});

// ---------- Demographics page ----------

const demographics = {
  type: jsPsychSurveyText,
  preamble: `
    <h2>About You</h2>
    <p>Please answer a few questions before the survey begins.</p>
  `,
  questions: [
    { prompt: "First name:", name: "first_name", required: true },
    { prompt: "Last name:", name: "last_name", required: true }
  ],
  data: {
    screen_type: "demographics"
  }
};

// ---------- Intro screen (experiment-level) ----------

const welcome = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    
    <div style="max-width: 700px; margin: 0 auto; text-align: left;">

    <h1 style="text-align: center; margin-bottom: 24px;">
      Feature Importance Survey
    </h1>

    <p style="font-size: 18px; margin-bottom: 12px;">
      <strong>Task.</strong>
      You will rate how important different features are for describing 5 different animals.
    </p>

    <p style="font-size: 16px; margin-bottom: 18px;">
      <strong>How to answer.</strong>
      For each question, use the 1–5 scale where
      <strong>1 = "Not important"</strong> and
      <strong>5 = "Very important"</strong>.
    </p>

    <p style="font-size: 15px; margin-bottom: 24px;">
      <strong>Example.</strong>
      When rating a <b>dolphin</b>, you might judge <b>“swims”</b> and <b>“ocean”</b> as
      <b>very important</b> features, while rating <b>“gray”</b> as <b>not very important</b>—even
      though dolphins are in fact gray—because color matters less in your opinion than movement or habitat for
      defining what a dolphin is. There are no wrong answers. 
    </p>

    <p style="font-size: 18px; text-align: center;">
      <strong>Click "Begin" to start.</strong>
    </p>

  </div>
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

// 1) Demographics first
timeline.push(demographics);

// 2) Then welcome / instructions
timeline.push(welcome);

// 3) Then 5 × (intro + feature page)
sampledAnimals.forEach(animalIdx => {
  const animalName = animalNames[animalIdx];
  const row = animalFeatures[animalIdx];

  // --- 3a) Intro page for this animal ---
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

  // --- 3b) Select 10 present features for this animal ---
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