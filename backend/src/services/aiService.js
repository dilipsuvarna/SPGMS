const { classifyComplaint, detectPriority } = require('../utils/classifier');

const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

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
    const response = await fetch(`${AI_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) throw new Error(`AI service error: ${response.status}`);
    const data = await response.json();
    return {
      department: data.department || classifyComplaint(text),
      departmentConfidence: data.departmentConfidence || 0.7,
      priority: data.priority || detectPriority(text),
      priorityConfidence: data.priorityConfidence || 0.7,
      keywords: data.keywords || [],
      emergencyIndicators: data.emergencyIndicators || [],
      source: 'python'
    };
  } catch (err) {
    console.warn('[aiService] falling back to local heuristic', err && err.message);
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
