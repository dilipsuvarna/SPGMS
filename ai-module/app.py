from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from pathlib import Path
import joblib
import re

app = FastAPI(title='SPGMS AI Module')
MODEL_PATH = Path(__file__).parent / 'data' / 'complaint_model.joblib'
MODEL = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None


class AnalysisRequest(BaseModel):
    text: str


class AnalysisResponse(BaseModel):
    department: str
    departmentConfidence: float
    priority: str
    priorityConfidence: float
    keywords: list[str]
    emergencyIndicators: list[str]


DEPARTMENT_RULES = {
    'Water': [
        ('water supply', 5), ('water shortage', 5), ('pipeline', 4), ('water main', 4),
        ('sewer', 4), ('sewage', 3), ('drainage', 3), ('drain', 2), ('tap', 2),
        ('faucet', 2), ('water', 1), ('leak', 1), ('leaking pipe', 4), ('pipe', 1),
        ('no water', 4), ('waterlogging', 4), ('water logged', 4)
    ],
    'Waste': [
        ('garbage collection', 5), ('solid waste', 5), ('illegal dumping', 5),
        ('garbage dump', 4), ('waste disposal', 4), ('trash', 3), ('garbage', 3),
        ('litter', 3), ('refuse', 3), ('bins', 2), ('waste', 2), ('sanitation', 2),
        ('household waste', 4), ('dumping', 3), ('dirty street', 3)
    ],
    'Electricity': [
        ('electric shock', 6), ('live wire', 6), ('power outage', 5), ('power cut', 5),
        ('street light', 4), ('streetlight', 4), ('transformer', 4),
        ('short circuit', 4), ('electric pole', 4), ('electrical', 3),
        ('electricity', 3), ('power', 2), ('wire', 2), ('light', 1),
        ('no power', 5), ('blackout', 5), ('sparking', 5)
    ],
    'Road': [
        ('road collapse', 6), ('traffic signal', 5), ('traffic light', 5),
        ('pothole', 5), ('sinkhole', 5), ('road damage', 4), ('broken pavement', 4),
        ('footpath', 3), ('sidewalk', 3), ('road', 2), ('bridge', 2),
        ('asphalt', 2), ('pavement', 2), ('crack', 1), ('road blocked', 5),
        ('traffic jam', 3), ('fallen tree', 4), ('damaged road', 4)
    ]
}

PRIORITY_RULES = {
    'Critical': [
        ('electrocution', 10), ('electric shock', 10), ('live wire', 10),
        ('transformer fire', 10), ('gas leak', 10), ('road collapse', 10),
        ('bridge collapse', 10), ('building collapse', 10), ('accident hazard', 9), ('danger to life', 9),
        ('flooding', 8), ('major pipeline burst', 8), ('exposed wire', 8),
        ('fire', 7), ('burning waste', 9), ('waste is being burned', 9),
        ('injured', 7), ('emergency', 6), ('trapped', 8),
        ('life threatening', 10), ('children at risk', 9), ('school zone', 4)
    ],
    'High': [
        ('complete power outage', 7), ('power outage', 6), ('no electricity', 6),
        ('no power', 6), ('blackout', 6),         ('garbage not collected', 6), ('garbage has not been collected', 6),
        ('waste not collected', 6), ('not collected for a week', 6),
        ('no water supply', 6), ('water supply stopped', 6), ('burst pipeline', 6),
        ('overflowing sewage', 6), ('sewage overflow', 6), ('large pothole', 5),
        ('major leak', 5), ('blocked main road', 5), ('public health hazard', 5),
        ('dangerous', 4), ('urgent', 4), ('major', 3), ('many households', 5),
        ('entire area', 5), ('road blocked', 5), ('traffic blocked', 5)
    ],
    'Medium': [
        ('garbage accumulation', 4), ('broken streetlight', 4),
        ('street light not working', 4), ('streetlight not working', 4),
        ('streetlight is not working', 4),
        ('water leakage', 3), ('water tap is leaking', 3), ('minor flooding', 3),
        ('small pothole', 3), ('traffic light not working', 3),
        ('uncollected garbage', 4), ('missed garbage collection', 4),
        ('garbage dump', 3), ('garbage piled', 3),
        ('garbage has not been collected', 5), ('waste piled', 3),
        ('garbage is piled', 3), ('waste is piled', 3),
        ('litter', 2), ('service interruption', 3),
        ('leak', 2), ('crack', 2), ('cracks', 2), ('needs repair', 2),
        ('overflowing bin', 2), ('not working', 2),
        ('intermittent', 2), ('occasional', 2)
    ],
    'Low': [
        ('cosmetic damage', 3), ('small crack', 3), ('minor leakage', 3),
        ('minor pavement damage', 5), ('slight drip', 4), ('small amount of litter', 4),
        ('small issue', 2), ('minor waste', 2), ('routine', 2)
    ]
}

PRIORITY_RANK = {'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4}


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'[^\w]+', ' ', (text or '').lower())).strip()


def phrase_matches(text: str, phrase: str) -> bool:
    match = re.search(rf'(^|\s){re.escape(phrase)}(?=\s|$)', text)
    if not match:
        return False

    # Do not escalate reports that explicitly deny the indicator.
    prefix = text[:match.start()].split()
    return not prefix or prefix[-1] not in {'no', 'not', 'never', 'without', 'fixed'}


def score_rules(text: str, rules: list[tuple[str, int]]) -> int:
    return sum(weight for phrase, weight in rules if phrase_matches(text, phrase))


def classify_department(text: str) -> tuple[str, float]:
    scores = {department: score_rules(text, rules) for department, rules in DEPARTMENT_RULES.items()}
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    department, best_score = ranked[0]
    second_score = ranked[1][1]
    confidence = 0.25 if best_score == 0 else min(
        0.98,
        0.5 + min(0.3, best_score * 0.04) + min(0.15, max(0, best_score - second_score) * 0.05)
    )
    return department, round(confidence, 2)


def resolve_department(text: str, model_department: str, model_confidence: float) -> tuple[str, float]:
    rule_department, rule_confidence = classify_department(text)
    normalized = normalize(text)
    strong_phrases = {
        'Water': ('no water', 'water supply', 'pipeline', 'sewage', 'tap', 'faucet'),
        'Waste': ('garbage', 'trash', 'rubbish', 'waste collection', 'illegal dumping', 'litter'),
        'Electricity': ('no power', 'no electricity', 'power outage', 'blackout', 'transformer', 'electric shock', 'live wire'),
        'Road': ('pothole', 'road collapse', 'bridge', 'footpath', 'sidewalk', 'sinkhole', 'asphalt', 'pavement'),
    }
    matches = {
        department: sum(1 for phrase in phrases if phrase in normalized)
        for department, phrases in strong_phrases.items()
    }
    best_department, best_matches = max(matches.items(), key=lambda item: item[1])
    if best_matches > 0:
        second_matches = max((count for department, count in matches.items() if department != best_department), default=0)
        if best_matches >= 2 or best_matches > second_matches:
            return best_department, min(0.99, 0.86 + (best_matches - second_matches) * 0.05)
    if rule_confidence >= 0.75 and model_confidence < 0.85:
        return rule_department, rule_confidence
    return model_department, model_confidence


def classify_priority(text: str) -> tuple[str, float, list[str]]:
    if 'bridge' in text and 'collapse' in text:
        return 'Critical', 0.96, ['bridge collapse']
    scores = {priority: score_rules(text, rules) for priority, rules in PRIORITY_RULES.items()}
    matched = [(priority, score) for priority, score in scores.items() if score > 0]
    if not matched:
        return 'Medium', 0.4, []

    priority, score = max(
        matched,
        key=lambda item: (item[1], PRIORITY_RANK[item[0]])
    )
    emergency = [
        phrase for phrase, _ in PRIORITY_RULES['Critical']
        if priority == 'Critical' and phrase_matches(text, phrase)
    ]
    runner_up = max((other_score for other_priority, other_score in matched if other_priority != priority), default=0)
    confidence = min(
        0.98,
        0.5 + min(0.35, score * 0.04) + min(0.1, max(0, score - runner_up) * 0.03)
    )
    return priority, round(confidence, 2), emergency


def resolve_priority(text: str, model_priority: str, model_confidence: float) -> tuple[str, float, list[str]]:
    rule_priority, rule_confidence, emergency = classify_priority(text)
    if rule_confidence >= 0.5 and (
        rule_priority != model_priority or model_confidence < 0.85
    ):
        return rule_priority, rule_confidence, emergency
    return model_priority, model_confidence, emergency


@app.get('/', response_class=PlainTextResponse)
def service_status():
    return 'AI service is running.'


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.post('/analyze', response_model=AnalysisResponse)
def analyze(req: AnalysisRequest):
    text = normalize(req.text)
    if not text:
        return AnalysisResponse(
            department='Water', departmentConfidence=0.25,
            priority='Medium', priorityConfidence=0.4,
            keywords=[], emergencyIndicators=[]
        )

    if MODEL:
        department_model = MODEL['department']
        priority_model = MODEL['priority']
        predicted_department = str(department_model.predict([text])[0])
        priority = str(priority_model.predict([text])[0])
        model_department_confidence = round(float(max(department_model.predict_proba([text])[0])), 2)
        priority_confidence = round(float(max(priority_model.predict_proba([text])[0])), 2)
        department, department_confidence = resolve_department(
            text, predicted_department, model_department_confidence
        )
        priority, priority_confidence, emergency = resolve_priority(text, priority, priority_confidence)
    else:
        department, department_confidence = classify_department(text)
        priority, priority_confidence, emergency = classify_priority(text)
    keywords = list(dict.fromkeys(
        word for word in text.split() if len(word) > 3
    ))[:8]

    return AnalysisResponse(
        department=department,
        departmentConfidence=department_confidence,
        priority=priority,
        priorityConfidence=priority_confidence,
        keywords=keywords,
        emergencyIndicators=emergency
    )
