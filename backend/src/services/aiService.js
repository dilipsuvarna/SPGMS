const { classifyComplaint, detectPriority } = require('../utils/classifier');

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'https://ai-module-dmh1.onrender.com').replace(/\/+$/, '');
const AI_REQUEST_TIMEOUT_MS = 10000;

function parseAnalysis(data) {
  if (
    !data ||
    typeof data !== 'object' ||
    typeof data.department !== 'string' ||
    typeof data.departmentConfidence !== 'number' ||
    typeof data.priority !== 'string' ||
    typeof data.priorityConfidence !== 'number' ||
    !Array.isArray(data.keywords) ||
    !data.keywords.every((keyword) => typeof keyword === 'string') ||
    !Array.isArray(data.emergencyIndicators) ||
    !data.emergencyIndicators.every((indicator) => typeof indicator === 'string')
  ) {
    throw new Error('AI service returned an invalid analysis response');
  }

  return {
    department: data.department,
    departmentConfidence: data.departmentConfidence,
    priority: data.priority,
    priorityConfidence: data.priorityConfidence,
    keywords: data.keywords,
    emergencyIndicators: data.emergencyIndicators,
    source: 'python'
  };
}

async function analyzeText(text) {
  if (!text || !String(text).trim()) {
    return {
      department: 'Water',
      departmentConfidence: 0.5,
      priority: 'Medium',
      priorityConfidence: 0.5,
      keywords: [],
      emergencyIndicators: [],
      source: 'fallback'
    };
  }

  try {
    const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`);
    }

    return parseAnalysis(await response.json());
  } catch (err) {
    console.warn('[aiService] AI request failed; using local heuristic', err && err.message);
    return {
      department: classifyComplaint(text),
      departmentConfidence: 0.65,
      priority: detectPriority(text),
      priorityConfidence: 0.65,
      keywords: [],
      emergencyIndicators: [],
      source: 'fallback'
    };
  }
}

module.exports = { analyzeText };
