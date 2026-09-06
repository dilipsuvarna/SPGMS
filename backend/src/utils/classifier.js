const stringSimilarity = require('string-similarity');

const DEPARTMENTS = {
  water: ['water', 'pipeline', 'leak', 'leakage', 'burst', 'tap', 'pipe'],
  waste: ['garbage', 'trash', 'waste', 'sewage', 'refuse', 'dump', 'bins', 'overflowing', 'sewage', 'garbage accumulation'],
  electricity: ['electric', 'electricity', 'power', 'streetlight', 'wire', 'cable', 'light', 'short circuit', 'live wire', 'street light'],
  road: ['road', 'pothole', 'potholes', 'asphalt', 'carriageway', 'collapse', 'sinkhole', 'pavement', 'crack', 'road collapse']
};

function classifyComplaint(text) {
  if (!text) return 'Road';
  const t = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const strongRules = [
    ['Electricity', ['no power', 'no electricity', 'power outage', 'blackout', 'transformer', 'electric shock', 'live wire']],
    ['Water', ['no water', 'water supply', 'pipeline', 'sewage', 'faucet']],
    ['Waste', ['garbage', 'trash', 'rubbish', 'waste collection', 'illegal dumping', 'litter']],
    ['Road', ['pothole', 'road collapse', 'bridge', 'footpath', 'sidewalk', 'sinkhole', 'asphalt']]
  ];
  const strongMatch = strongRules
    .map(([department, phrases]) => [department, phrases.filter((phrase) => t.includes(phrase)).length])
    .sort((a, b) => b[1] - a[1]);
  if (strongMatch[0][1] > 0 && strongMatch[0][1] > strongMatch[1][1]) return strongMatch[0][0];
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
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const rules = {
    Critical: [
      ['electrocution', 10], ['electric shock', 10], ['live wire', 10],
      ['transformer fire', 10], ['gas leak', 10], ['road collapse', 10],
      ['building collapse', 10], ['life threatening', 10], ['danger to life', 9],
      ['immediate danger', 9], ['fire', 8], ['burning waste', 9],
      ['waste is being burned', 9], ['injured', 8], ['trapped', 8],
      ['emergency', 7], ['exposed wire', 8], ['flooding', 8]
    ],
    High: [
      ['complete power outage', 7], ['power outage', 6], ['no electricity', 6],
      ['no power', 6], ['blackout', 6], ['garbage not collected', 6],
      ['waste not collected', 6], ['not collected for a week', 6],
      ['no water supply', 6], ['water supply stopped', 6], ['burst pipeline', 6],
      ['overflowing sewage', 6], ['sewage overflow', 6], ['large pothole', 5],
      ['major leak', 5], ['blocked main road', 5], ['public health hazard', 5],
      ['dangerous', 4], ['urgent', 4], ['major', 3], ['many households', 5],
      ['entire area', 5], ['road blocked', 5], ['traffic blocked', 5]
    ],
    Medium: [
      ['garbage accumulation', 4], ['broken streetlight', 4],
      ['street light not working', 4], ['streetlight not working', 4],
      ['streetlight is not working', 4],
      ['water leakage', 3], ['water tap is leaking', 3],
      ['small pothole', 3], ['traffic light not working', 3],
      ['uncollected garbage', 4], ['missed garbage collection', 4],
      ['garbage dump', 3], ['garbage piled', 3], ['garbage has not been collected', 5],
      ['garbage is piled', 3], ['waste piled', 3], ['waste is piled', 3],
      ['litter', 2], ['service interruption', 3],
      ['leak', 2], ['leaking', 2], ['leakage', 2], ['crack', 2],
      ['cracks', 2], ['needs repair', 2],
      ['overflowing bin', 2], ['not working', 2]
    ],
    Low: [
      ['cosmetic damage', 3], ['small crack', 3], ['minor leakage', 3],
      ['minor pavement damage', 5], ['slight drip', 4],
      ['small amount of litter', 4], ['small issue', 2], ['minor waste', 2]
    ]
  };
  const rank = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  let best = 'Low';
  let bestScore = 0;
  for (const [priority, entries] of Object.entries(rules)) {
    const score = entries.reduce((total, [phrase, weight]) => {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
      return total + (new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'i').test(normalized) ? weight : 0);
    }, 0);
    if (score > bestScore || (score > 0 && score === bestScore && rank[priority] > rank[best])) {
      best = priority;
      bestScore = score;
    }
  }
  return best;
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
