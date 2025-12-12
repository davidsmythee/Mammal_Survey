#!/usr/bin/env node
/**
 * similarity_matrix.js
 * 
 * Creates a similarity matrix for mammals using weighted city block distance.
 * 
 * Distance: d_ij = Σ w_k * |x_ik - x_jk|
 * Similarity: S(i,j) = 1 / (1 + β * d_ij)
 * Beta: β = 1 / mean(d)
 * 
 * Usage: node similarity_matrix.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAsIeHc3hWx3_qS2bWXvOiJaKR6rmPM9Hw",
  authDomain: "mammalsurvey-69cfa.firebaseapp.com",
  projectId: "mammalsurvey-69cfa",
  storageBucket: "mammalsurvey-69cfa.firebasestorage.app",
  messagingSenderId: "918927677850",
  appId: "1:918927677850:web:684a74b563f19baed80223"
};

// Animal and feature data (all 50 animals)
const animalNames = ["antelope", "grizzly bear", "killer whale", "beaver", "dalmatian", "persian cat", "horse", "german shepherd", "blue whale", "siamese cat", "skunk", "mole", "tiger", "hippopotamus", "leopard", "moose", "spider monkey", "humpback whale", "elephant", "gorilla", "ox", "fox", "sheep", "seal", "chimpanzee", "hamster", "squirrel", "rhinoceros", "rabbit", "bat", "giraffe", "wolf", "chihuahua", "rat", "weasel", "otter", "buffalo", "zebra", "giant panda", "deer", "bobcat", "pig", "lion", "mouse", "polar bear", "collie", "walrus", "raccoon", "cow", "dolphin"];
const featureNames = ["black", "white", "blue", "brown", "gray", "orange", "red", "yellow", "patches", "spots", "stripes", "furry", "hairless", "toughskin", "big", "small", "bulbous", "lean", "flippers", "hands", "hooves", "pads", "paws", "longleg", "longneck", "tail", "chewteeth", "meatteeth", "buckteeth", "strainteeth", "horns", "claws", "tusks", "smelly", "flys", "hops", "swims", "tunnels", "walks", "fast", "slow", "strong", "weak", "muscle", "bipedal", "quadrapedal", "active", "inactive", "nocturnal", "hibernate", "agility", "fish", "meat", "plankton", "vegetation", "insects", "forager", "grazer", "hunter", "scavenger", "skimmer", "stalker", "newworld", "oldworld", "arctic", "coastal", "desert", "bush", "plains", "forest", "fields", "jungle", "mountains", "ocean", "ground", "water", "tree", "cave", "fierce", "timid", "smart", "group", "solitary", "nestspot", "domestic"];
const animalFeatures = [[false,false,false,false,false,false,false,false,false,false,false,true,false,true,true,false,false,true,false,false,true,false,false,true,false,true,true,false,false,false,true,false,false,false,false,false,false,false,true,true,false,true,false,true,false,true,true,false,false,false,true,false,false,false,true,false,true,true,false,false,false,false,true,true,false,false,false,false,true,false,true,false,true,false,true,false,false,false,false,true,false,true,false,false,false],[true,false,false,true,false,false,false,false,false,false,false,true,false,true,true,false,true,false,false,false,false,false,true,false,false,false,true,true,false,false,false,true,false,false,false,false,false,false,true,true,true,true,false,true,true,true,true,true,true,true,false,true,true,false,false,false,true,false,true,false,false,true,true,false,false,false,false,false,false,true,false,false,true,false,true,false,false,true,true,false,true,false,true,false,false],[true,true,false,false,false,false,false,false,true,true,false,false,true,true,true,false,true,true,true,false,false,false,false,false,false,true,false,true,false,true,false,false,false,false,false,false,true,false,false,true,false,true,false,false,false,false,true,false,false,false,true,true,true,true,false,false,false,false,true,false,false,false,false,false,true,true,false,false,false,false,false,false,false,true,false,true,false,false,true,false,true,true,false,false,false],[false,false,false,true,false,false,false,false,false,false,false,true,false,true,false,true,true,false,false,false,false,true,true,false,false,true,true,false,true,true,false,true,false,false,false,false,true,false,false,true,false,true,false,true,false,true,true,false,true,true,true,true,false,false,false,false,false,false,false,false,false,false,true,false,false,true,false,false,false,false,false,false,false,false,true,true,false,false,false,true,true,true,true,true,false],[true,true,false,false,false,false,false,false,true,true,false,true,true,false,true,false,false,true,false,false,false,false,true,true,false,true,true,true,false,false,false,false,false,false,false,false,false,false,true,true,false,true,false,true,false,true,true,false,false,false,true,false,true,false,false,false,false,false,false,false,false,false,true,true,false,false,false,false,false,false,false,false,false,false,true,false,false,false,false,true,true,true,true,false,true],[false,true,true,false,true,false,false,false,false,false,false,true,false,false,false,true,true,false,false,false,false,true,true,false,false,true,true,true,false,false,false,true,false,false,false,false,false,false,true,true,true,false,true,false,false,true,false,true,false,false,true,true,true,false,false,false,false,false,false,false,false,false,true,true,false,false,false,false,false,false,false,false,false,false,true,false,false,false,false,true,true,false,true,false,true],[true,true,false,true,true,false,false,false,true,false,false,true,false,true,true,false,false,true,false,false,true,false,false,true,true,true,true,false,true,false,false,false,false,true,false,false,false,false,true,true,false,true,false,true,false,true,true,false,false,false,true,false,false,false,true,false,false,true,false,false,false,false,true,true,false,false,false,false,true,false,true,false,false,false,true,false,false,false,false,true,true,true,false,false,true],[true,false,false,true,true,false,false,false,true,false,false,true,false,false,true,false,false,true,false,false,false,true,true,true,false,true,true,true,false,false,false,true,false,true,false,false,false,false,true,true,false,true,false,true,false,true,true,false,false,false,true,false,true,false,false,false,false,false,true,false,false,true,true,true,false,false,false,false,true,false,false,false,false,false,true,false,false,false,true,false,true,false,true,false,true],[false,false,true,false,true,false,false,false,false,true,false,false,true,true,true,false,true,false,true,false,false,false,false,false,false,true,false,false,false,true,false,false,false,false,false,false,true,false,false,true,true,true,false,true,false,false,false,true,false,false,false,true,false,true,false,false,false,false,false,false,true,false,true,true,true,false,false,false,false,false,false,false,false,true,false,true,false,false,false,true,true,true,true,false,false],[true,true,false,true,true,false,false,false,true,false,false,true,false,false,false,true,false,true,false,false,false,true,true,true,false,true,true,true,false,false,false,true,false,false,false,false,false,false,true,true,false,false,true,true,false,true,true,true,true,false,true,true,true,false,false,false,false,false,true,false,false,true,true,true,false,false,false,false,false,false,false,false,false,false,true,false,false,false,true,true,true,false,true,false,true],[true,true,false,false,false,false,false,false,false,false,true,true,false,false,false,true,true,false,false,false,false,true,true,false,false,true,false,false,false,false,false,false,false,true,false,false,false,false,true,true,true,false,true,false,false,true,true,false,true,true,false,false,false,false,true,false,true,false,false,false,false,false,true,true,false,false,false,false,false,true,true,false,false,false,true,false,false,false,false,true,false,false,true,false,false],[true,false,false,true,true,false,false,false,false,false,false,true,false,false,false,true,true,true,false,false,false,false,true,false,false,false,true,false,true,false,false,true,false,false,false,false,false,true,true,true,true,false,true,false,false,true,true,false,true,true,true,false,false,false,true,true,true,false,false,false,false,false,true,true,false,false,false,false,true,true,true,false,false,false,true,false,false,false,false,true,false,false,true,true,false],[true,true,false,false,false,true,false,false,false,false,true,true,false,false,true,false,false,true,false,false,false,true,true,false,false,true,true,true,true,false,false,true,false,true,false,false,false,false,true,true,false,true,false,true,false,true,true,false,true,false,true,false,true,false,false,false,false,false,true,false,false,true,false,true,false,false,false,true,true,true,false,true,false,false,true,false,false,false,true,false,true,true,true,true,false],[false,false,false,false,true,false,false,false,false,false,false,false,true,true,true,false,true,false,false,false,false,false,false,false,false,false,true,false,false,true,false,false,false,false,false,false,true,false,true,false,true,true,false,true,false,true,false,true,false,false,false,true,false,false,true,false,false,false,false,false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,true,true,false,false,false,true,false,false,true,false,false],[true,false,false,true,false,false,false,true,true,true,false,true,false,false,true,false,false,true,false,false,false,false,true,true,false,true,false,true,false,false,false,true,false,false,false,false,false,false,true,true,false,true,false,true,false,true,true,false,true,false,true,true,true,false,false,false,true,false,true,false,false,true,true,true,false,false,false,true,true,false,false,true,true,false,true,false,true,false,true,false,true,false,true,true,false],[false,false,false,true,false,false,false,false,false,false,false,true,false,true,true,false,true,false,false,false,true,false,false,true,true,true,true,false,false,false,true,false,false,true,false,false,false,false,true,true,true,true,false,true,false,true,false,true,false,false,false,false,false,false,true,false,true,true,false,false,false,false,true,true,true,false,false,false,true,true,true,false,true,false,true,false,false,false,false,true,false,true,true,false,false],[true,false,false,true,true,false,false,false,false,false,false,true,false,false,false,true,false,true,false,true,false,false,true,true,false,true,true,false,false,false,false,false,false,false,false,false,false,false,true,true,false,true,false,true,true,true,true,false,false,false,true,false,false,false,true,false,true,true,false,false,false,false,true,true,false,false,false,false,false,true,false,true,false,false,false,false,true,false,false,true,true,true,false,true,false],[true,false,true,false,true,false,false,false,false,false,false,false,true,true,true,false,true,false,true,false,false,false,false,false,false,true,false,false,false,true,false,false,false,false,false,false,true,false,false,true,true,true,false,true,false,false,false,true,false,false,false,true,false,true,false,false,false,false,false,false,true,false,true,true,true,true,false,false,false,false,false,false,false,true,false,true,false,false,false,true,true,true,false,false,false],[false,false,false,false,true,false,false,false,false,false,false,false,true,true,true,false,true,false,false,false,false,false,false,true,false,true,true,false,false,false,false,false,true,true,false,false,false,false,true,false,true,true,false,true,false,true,false,true,false,false,false,false,false,false,true,false,false,true,false,false,false,false,false,true,false,false,false,true,false,false,false,true,false,false,true,false,false,false,false,true,true,true,false,false,false],[true,false,false,true,false,false,false,false,false,false,false,true,false,true,true,false,true,false,false,true,false,false,false,true,false,false,true,true,false,false,false,false,false,true,false,false,false,false,true,true,false,true,false,true,true,true,true,false,false,false,true,false,true,false,true,false,true,false,false,false,false,false,false,true,false,false,false,false,false,true,false,true,false,false,true,false,true,false,true,false,true,true,false,true,false],[true,true,false,true,true,false,false,false,false,false,false,true,true,true,true,false,true,false,false,false,true,false,false,false,false,true,true,false,false,false,true,false,false,true,false,false,false,false,true,false,true,true,false,true,false,true,false,true,false,false,false,false,false,false,true,false,false,true,false,false,false,false,true,true,false,false,false,true,true,false,true,false,false,false,true,false,false,false,false,true,false,false,true,false,true],[false,false,false,true,false,true,true,false,false,false,false,true,false,false,false,true,false,true,false,false,false,true,true,false,false,true,true,true,false,false,false,true,false,false,false,false,false,false,true,true,false,true,false,true,false,true,true,false,true,true,true,true,true,false,false,false,true,false,true,false,false,true,true,true,false,false,false,false,true,true,true,false,false,false,true,false,false,false,true,false,true,false,true,true,false],[true,true,false,false,false,false,false,false,false,false,false,true,false,false,false,false,true,false,false,false,true,false,false,false,false,false,true,false,false,false,false,false,false,true,false,false,false,false,true,false,true,false,true,false,false,true,false,true,false,false,false,false,false,false,true,false,false,true,false,false,false,false,true,true,false,false,false,false,true,false,true,false,true,false,true,false,false,false,false,true,false,true,false,false,true],[true,true,false,true,true,false,false,false,false,true,false,false,true,true,true,true,false,false,true,false,false,false,false,false,false,true,false,false,false,false,false,false,false,false,false,false,true,false,false,true,true,true,false,false,false,false,true,true,false,false,true,true,false,false,false,false,false,false,true,false,false,false,true,true,true,true,false,false,false,false,false,false,false,true,false,true,false,false,false,true,true,true,false,false,true],[true,false,false,true,false,false,false,false,false,false,false,true,false,true,true,true,false,true,false,true,false,false,false,true,false,true,true,true,false,false,false,false,false,true,false,false,false,false,true,true,false,true,false,true,true,true,true,false,false,false,true,false,false,false,true,true,true,false,false,false,false,false,true,true,false,false,false,true,false,true,false,true,true,false,true,false,true,false,true,true,true,true,false,true,true],[true,true,false,true,true,false,false,false,true,false,false,true,false,false,false,true,true,false,false,false,false,false,true,false,false,true,true,false,true,false,false,true,false,true,false,true,false,true,true,true,false,false,true,false,false,true,true,true,true,true,true,false,false,false,true,false,true,true,false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false,true,false,false,false,false,true,false,false,true,true,true],[false,false,false,true,true,false,false,false,false,false,false,true,false,false,false,true,false,false,false,false,false,true,true,false,false,true,true,false,true,false,false,true,false,false,false,true,false,false,true,true,false,false,false,false,true,true,true,false,false,true,true,false,false,false,true,false,true,false,false,false,false,false,true,true,false,false,false,false,false,true,false,false,false,false,true,false,true,false,false,true,false,false,true,true,false],[false,false,false,false,true,false,false,false,false,false,false,false,true,true,true,false,true,false,false,false,true,false,false,false,false,false,false,false,false,false,true,false,true,true,false,false,false,false,true,false,true,true,false,false,false,true,false,true,false,false,false,false,false,false,true,false,false,true,false,false,false,false,false,true,false,false,false,true,false,false,false,true,false,false,true,false,false,false,true,false,false,true,true,false,false],[true,true,false,true,true,false,false,false,true,false,false,true,false,false,false,true,true,false,false,false,false,false,true,false,false,true,true,false,true,false,false,false,false,false,false,true,false,false,false,true,false,false,true,false,false,true,true,true,false,false,true,false,false,false,true,false,true,true,false,false,false,false,true,true,false,false,false,true,true,true,true,false,false,false,true,false,false,false,false,true,false,true,false,true,true],[true,false,false,true,true,false,false,false,false,false,false,true,true,true,false,true,false,true,false,false,false,false,false,false,false,false,true,true,false,false,false,true,false,true,true,false,false,false,false,true,false,false,true,true,true,false,true,true,true,true,true,false,true,false,true,true,true,false,true,true,false,false,true,true,false,false,false,false,false,true,false,true,true,false,false,false,true,true,true,false,true,true,false,true,false],[false,false,false,true,false,true,false,true,true,true,false,false,false,false,true,false,false,true,false,false,true,false,false,true,true,true,true,false,false,false,true,false,false,true,false,false,false,false,true,true,true,true,false,true,false,true,true,true,false,false,false,false,false,false,true,false,false,true,false,false,false,false,false,true,false,false,false,true,true,false,true,false,false,false,true,false,false,false,false,true,false,true,false,false,false],[true,true,false,true,true,false,false,false,false,false,false,true,false,false,true,false,false,true,false,false,false,true,true,false,false,true,true,true,false,false,false,true,false,false,false,false,false,false,true,true,false,true,false,true,false,true,true,false,true,false,true,false,true,false,false,false,true,false,true,true,false,true,true,true,true,false,false,false,true,true,false,false,true,false,true,false,false,true,true,false,true,true,true,false,false],[true,false,false,true,true,false,false,false,false,false,false,true,false,false,false,true,false,true,false,false,false,true,true,false,false,true,false,true,false,false,false,true,false,true,false,false,false,false,true,true,false,false,true,false,false,true,true,false,false,false,false,false,true,false,false,false,false,false,false,false,false,false,true,true,false,false,false,false,false,false,false,false,false,false,true,false,false,false,true,true,true,false,true,false,true],[true,true,false,true,true,false,false,false,false,false,false,true,false,false,false,true,true,true,false,false,false,false,true,false,false,true,false,true,true,false,false,true,false,true,false,false,false,true,true,true,false,false,false,false,false,true,true,false,true,true,true,false,true,false,false,true,true,false,true,true,false,false,true,true,false,false,false,false,true,true,true,false,false,false,true,false,false,false,true,false,true,false,true,true,false],[true,false,false,true,true,false,false,false,false,false,false,true,false,false,false,true,false,true,false,false,false,false,true,false,false,true,true,true,false,false,false,true,false,true,false,false,false,true,true,true,false,false,false,true,false,true,true,false,true,false,true,false,true,false,false,false,true,false,true,false,false,false,true,true,false,false,false,false,false,true,true,false,false,false,true,false,false,false,true,false,true,false,true,false,false],[true,false,false,true,false,false,false,false,false,false,false,true,false,false,false,true,true,true,true,false,false,false,true,false,false,true,true,true,true,false,false,true,false,false,false,false,true,false,false,true,false,false,false,false,false,true,true,false,false,false,true,true,false,false,false,false,false,false,true,false,false,false,true,true,true,true,false,false,false,true,false,false,false,true,false,true,false,false,false,true,true,false,true,true,false],[true,false,false,true,false,false,false,false,false,false,false,true,false,true,true,false,true,false,false,false,true,false,false,false,false,false,true,false,false,false,true,false,false,true,false,false,false,false,true,true,true,true,false,true,false,true,false,true,false,false,false,false,false,false,true,false,true,true,false,false,false,false,true,false,false,false,false,false,true,false,false,false,false,false,true,false,false,false,true,false,false,true,false,false,false],[true,true,false,false,false,false,false,false,false,false,true,true,false,true,true,false,false,true,false,false,true,false,false,true,true,true,true,false,false,false,false,false,false,false,false,false,false,false,true,true,false,true,false,true,false,true,true,false,false,false,true,false,false,false,true,false,true,true,false,false,false,false,false,true,false,false,false,true,true,false,true,false,false,false,true,false,false,false,false,true,true,true,false,false,false],[true,true,false,false,false,false,false,false,true,true,false,true,false,false,true,false,true,false,false,false,false,true,true,false,false,false,true,false,true,false,false,true,false,false,false,false,false,false,true,false,true,true,false,false,true,true,false,true,false,false,false,true,false,false,true,false,true,true,false,false,false,false,true,true,false,false,false,true,false,true,false,true,false,false,true,false,true,false,false,true,true,true,true,true,true],[false,false,false,true,false,false,false,false,true,true,false,true,false,false,true,false,false,true,false,false,true,false,false,true,true,true,true,false,false,false,true,false,false,false,false,false,false,false,true,true,false,true,false,true,false,true,true,false,false,false,true,false,false,false,true,false,true,true,false,false,false,false,true,true,false,false,false,false,true,true,true,false,true,false,true,false,false,false,false,true,true,true,false,true,false],[false,false,false,true,false,true,false,true,false,true,false,true,false,false,false,true,false,true,false,false,false,true,true,false,false,true,false,true,false,false,false,true,false,false,false,false,false,false,true,true,false,true,false,true,false,true,true,false,false,true,true,false,true,false,false,false,true,false,true,false,false,true,true,true,false,false,false,false,true,true,false,false,true,false,true,false,true,true,true,false,true,false,true,false,false],[true,true,false,true,true,false,false,false,true,true,false,false,true,true,true,false,true,false,false,false,true,false,false,false,false,true,true,false,false,false,false,false,false,true,false,false,false,false,true,false,true,true,false,false,false,true,false,true,false,false,false,false,false,false,true,false,true,false,false,false,false,false,true,true,false,false,false,false,false,false,true,false,false,false,true,false,false,false,true,true,true,true,false,false,true],[false,false,false,true,false,false,false,true,false,false,false,true,false,false,true,false,true,true,false,false,false,true,true,false,false,true,false,true,false,false,false,true,false,true,false,false,false,false,true,true,false,true,false,true,false,true,true,true,false,false,true,false,true,false,false,false,true,false,true,false,false,true,false,true,false,false,true,true,false,true,false,true,true,false,true,false,false,false,true,false,true,true,false,true,false],[false,true,false,true,true,false,false,false,false,false,false,true,false,false,false,true,false,false,false,false,false,false,true,false,false,true,true,false,true,false,false,false,false,true,false,false,false,true,true,true,false,false,true,false,false,true,true,false,true,true,true,false,false,false,true,false,false,true,false,true,false,false,true,true,false,false,false,false,true,true,true,false,false,false,true,false,false,false,false,true,false,true,false,true,true],[false,true,false,false,false,false,false,false,false,false,false,true,false,true,true,false,true,false,false,false,false,true,true,false,false,false,true,true,false,false,false,true,false,true,false,false,true,false,true,true,true,true,false,false,true,true,true,true,false,true,true,true,true,false,false,false,true,false,true,true,false,true,true,true,true,true,false,false,false,false,false,false,false,true,true,true,false,false,true,false,false,false,true,false,false],[false,true,false,true,false,false,false,false,true,false,false,true,false,false,true,true,false,true,false,false,false,false,true,false,false,true,true,true,false,false,false,false,false,false,false,false,false,false,true,true,false,false,false,false,false,true,true,false,false,false,true,false,true,false,false,false,false,false,true,false,false,false,true,true,false,false,false,false,false,false,false,false,false,false,true,false,false,false,false,true,true,false,true,false,true],[false,false,false,true,true,false,false,false,false,false,false,false,true,true,true,false,true,false,true,false,false,false,false,false,false,false,true,true,true,true,false,false,true,true,false,false,true,false,false,true,true,true,false,false,false,false,false,true,false,false,false,true,false,false,false,false,false,false,false,false,false,false,true,false,true,true,false,false,false,false,false,false,false,true,false,true,false,false,false,true,true,true,false,true,false],[true,true,false,false,true,false,false,false,true,true,true,true,false,false,false,true,false,false,false,false,false,true,true,false,false,true,true,true,false,false,false,true,false,false,false,false,false,false,true,true,false,false,false,false,false,true,true,false,true,true,true,true,true,false,true,false,true,false,false,true,false,false,true,true,false,false,false,false,false,true,true,false,true,false,true,false,true,false,true,false,true,false,true,true,false],[true,true,false,true,false,false,false,false,true,true,false,true,false,true,true,false,true,false,false,false,true,false,false,false,false,true,true,false,false,false,true,false,false,true,false,false,false,false,true,false,true,true,false,false,false,true,true,true,false,false,false,false,false,false,true,false,false,true,false,false,false,false,true,true,false,false,false,false,true,false,true,false,false,false,true,false,false,false,false,true,false,true,false,false,true],[false,true,true,false,true,false,false,false,false,false,false,false,true,true,true,false,false,true,true,false,false,false,false,false,false,true,true,false,false,false,false,false,false,false,false,false,true,false,false,true,false,true,false,true,false,false,true,false,false,false,true,true,false,false,false,false,false,false,false,false,false,false,true,true,false,true,false,false,false,false,false,false,false,true,false,true,false,false,false,true,true,true,false,false,true]];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('📊 Building similarity matrix...\n');

  // Step 1: Fetch survey data and calculate normalized weights
  console.log('Step 1: Fetching feature weights from survey data...');
  
  const responsesRef = collection(db, 'responses');
  const snapshot = await getDocs(responsesRef);

  // Accumulate scores per feature
  const featureStats = {};
  featureNames.forEach(name => {
    featureStats[name] = { sum: 0, count: 0 };
  });

  snapshot.forEach(doc => {
    const data = doc.data();
    const responses = data.responses || [];

    responses.forEach(r => {
      const featureName = r.feature_name;
      const score = r.score;

      if (featureName && featureStats[featureName] !== undefined && score >= 1 && score <= 5) {
        featureStats[featureName].sum += score;
        featureStats[featureName].count += 1;
      }
    });
  });

  // Calculate averages
  const featureAvgs = featureNames.map(name => 
    featureStats[name].count > 0 
      ? featureStats[name].sum / featureStats[name].count 
      : 0
  );

  // Min-max normalize to get weights (0-1)
  const minAvg = Math.min(...featureAvgs.filter(a => a > 0));
  const maxAvg = Math.max(...featureAvgs);
  const range = maxAvg - minAvg;

  const weights = featureAvgs.map(avg => 
    avg > 0 && range > 0 ? (avg - minAvg) / range : 0
  );

  console.log(`   Loaded weights for ${featureNames.length} features`);
  console.log(`   Min avg: ${minAvg.toFixed(2)}, Max avg: ${maxAvg.toFixed(2)}\n`);

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
  const outputPath = path.join(__dirname, 'similarity_matrix.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✅ Saved to: ${outputPath}\n`);

  // Print some example similarities
  console.log('═'.repeat(55));
  console.log('SAMPLE SIMILARITIES');
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

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

