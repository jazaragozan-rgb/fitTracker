// build.js - Ejecutar antes de cada deploy: node build.js
const fs = require('fs');

const timestamp = Date.now();

// Actualiza sw.js con el timestamp actual
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/fittracker-[\w-]+/, `fittracker-${timestamp}`);
fs.writeFileSync('sw.js', sw);

console.log(`✅ SW actualizado con versión: fittracker-${timestamp}`);
console.log(`🚀 Ahora ejecuta: firebase deploy --only hosting`);