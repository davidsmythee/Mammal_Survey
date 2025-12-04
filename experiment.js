// ---------- Firebase init (compat style) ----------

const firebaseConfig = {
  apiKey: "AIzaSyAsIeHc3hWx3_qS2bWXvOiJaKR6rmPM9Hw",
  authDomain: "mammalsurvey-69cfa.firebaseapp.com",
  projectId: "mammalsurvey-69cfa",
  storageBucket: "mammalsurvey-69cfa.firebasestorage.app",
  messagingSenderId: "918927677850",
  appId: "1:918927677850:web:684a74b563f19baed80223"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ---------- jsPsych init with custom saving ----------

const jsPsych = initJsPsych({
  display_element: 'jspsych-target',
  on_finish: function() {

    const allData = jsPsych.data.get();

    // ✅ Extract ONLY name fields
    const demoTrial = allData.filter({ screen_type: 'demographics' }).values()[0];
    const demoResp = demoTrial ? demoTrial.response : {};

    const firstName = demoResp.first_name || "";
    const lastName  = demoResp.last_name || "";

    // ✅ Extract all feature responses
    const featureTrials = allData.filter({ screen_type: 'feature_block' }).values();
    const simplifiedResponses = [];

    featureTrials.forEach(trial => {
      const animal = trial.animal;
      const featureIndices = trial.feature_indices;
      const respObj = trial.response;

      featureIndices.forEach(featureIdx => {
        const key = `feature_${featureIdx}`;
        if (respObj.hasOwnProperty(key)) {
          const score = respObj[key] + 1;

          simplifiedResponses.push({
            animal: animal,
            feature_index: featureIdx,
            feature_name: featureNames[featureIdx],
            score: score
          });
        }
      });
    });

    // ✅ Save simplified document
    db.collection("responses").add({
      timestamp: new Date().toISOString(),
      first_name: firstName,
      last_name: lastName,
      responses: simplifiedResponses
    }).then(() => {
      alert("Thank you! Your responses were saved.");
    }).catch((error) => {
      console.error("Error saving data:", error);
      alert("There was an error saving your responses.");
    });
  }
});

// ---------- Demographics page (NAME ONLY + CHAR LIMITS) ----------

const demographics = {
  type: jsPsychSurveyHtmlForm,
  preamble: `
    <h2>About You</h2>
    <p>Please enter your name before the survey begins.</p>
  `,
  html: `
    <p>
      <label>
        First name:
        <input name="first_name" type="text" maxlength="30" required>
      </label>
    </p>

    <p>
      <label>
        Last name:
        <input name="last_name" type="text" maxlength="30" required>
      </label>
    </p>
  `,
  data: {
    screen_type: "demographics"
  }
};

// ---------- Intro screen ----------

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

let candidateAnimals = [];
for (let i = 0; i < animalNames.length; i++) {
  const row = animalFeatures[i];
  const countTrue = row.filter(v => v).length;
  if (countTrue >= 10) candidateAnimals.push(i);
}

let sampledAnimals = jsPsych.randomization.sampleWithoutReplacement(candidateAnimals, 5);

// ---------- Timeline ----------

let timeline = [];
timeline.push(demographics);
timeline.push(welcome);

sampledAnimals.forEach(animalIdx => {

  const animalName = animalNames[animalIdx];
  const row = animalFeatures[animalIdx];

  const animalIntro = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <h2>${animalName}</h2>
      <p>You will now answer 10 questions about this animal.</p>
    `,
    choices: ['Continue'],
    data: {
      screen_type: 'animal_intro',
      animal: animalName,
      animal_index: animalIdx
    }
  };

  timeline.push(animalIntro);

  let presentFeatureIndices = [];
  for (let j = 0; j < featureNames.length; j++) {
    if (row[j]) presentFeatureIndices.push(j);
  }

  const sampledFeatureIndices = jsPsych.randomization.sampleWithoutReplacement(
    presentFeatureIndices,
    10
  );

  const questions = sampledFeatureIndices.map((featureIdx, qIdx) => {

    let labels = ['1', '2', '3', '4', '5'];
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
      prompt: `How important is <b>${featureNames[featureIdx]}</b> for being a <b>${animalName}</b>?`,
      labels: labels,
      required: true,
      name: `feature_${featureIdx}`
    };
  });

  const featurePage = {
    type: jsPsychSurveyLikert,
    preamble: `<p><b>${animalName}</b></p>`,
    questions: questions,
    data: {
      screen_type: 'feature_block',
      animal: animalName,
      animal_index: animalIdx,
      feature_indices: sampledFeatureIndices
    }
  };

  timeline.push(featurePage);
});

// ---------- Outro ----------

const goodbye = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <h2>Thank you!</h2>
    <p>Your responses have been recorded.</p>
  `,
  choices: ['Finish'],
  data: { screen_type: 'goodbye' }
};

timeline.push(goodbye);
jsPsych.run(timeline);
