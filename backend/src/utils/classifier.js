const stringSimilarity = require('string-similarity');

const DEPARTMENTS = {
  water: ['water', 'pipeline', 'leak', 'leakage', 'burst', 'tap', 'pipe'],
  waste: ['garbage', 'trash', 'waste', 'sewage', 'refuse', 'dump', 'bins', 'overflowing', 'sewage', 'garbage accumulation'],
  electricity: ['electric', 'electricity', 'power', 'streetlight', 'wire', 'cable', 'light', 'short circuit', 'live wire', 'street light'],
  road: ['road', 'pothole', 'potholes', 'asphalt', 'carriageway', 'collapse', 'sinkhole', 'pavement', 'crack', 'road collapse']
};

function classifyComplaint(text) {
  if (!text) return 'Road';
  const t = text.toLowerCase();
  const scores = { Water: 0, Waste: 0, Electricity: 0, Road: 0 };

  for (const kw of DEPARTMENTS.water) if (t.includes(kw)) scores.Water++;
  for (const kw of DEPARTMENTS.waste) if (t.includes(kw)) scores.Waste++;
  for (const kw of DEPARTMENTS.electricity) if (t.includes(kw)) scores.Electricity++;
  for (const kw of DEPARTMENTS.road) if (t.includes(kw)) scores.Road++;

  // choose highest score, tie-breaker by presence of specific words
  let best = 'Water';
  let bestScore = scores.Water;
  for (const k of Object.keys(scores)) {
    if (scores[k] > bestScore) {
      best = k;
      bestScore = scores[k];
    }
  }

  return best;
}

function detectPriority(text) {
  if (!text) return 'Low';
  const t = text.toLowerCase();

  // Critical keywords
  const critical = ['live wire', 'electrocution', 'road collapse', 'major pipeline burst', 'gas leak'];
  for (const kw of critical) if (t.includes(kw)) return 'Critical';

  const high = ['overflowing sewage', 'large pothole', 'major', 'complete water supply interruption', 'burst pipeline', 'sewage'];
  for (const kw of high) if (t.includes(kw)) return 'High';

  const medium = ['broken streetlight', 'garbage accumulation', 'broken light', 'leak'];
  for (const kw of medium) if (t.includes(kw)) return 'Medium';

  return 'Low';
}

function descriptionSimilarity(a, b) {
  if (!a || !b) return 0;
  return stringSimilarity.compareTwoStrings(a, b);
}

module.exports = {
  classifyComplaint,
  detectPriority,
  descriptionSimilarity
};
