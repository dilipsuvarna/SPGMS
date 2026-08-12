from fastapi import FastAPI
from pydantic import BaseModel
import re

app = FastAPI(title='SPGMS AI Module')

class AnalysisRequest(BaseModel):
    text: str

class AnalysisResponse(BaseModel):
    department: str
    departmentConfidence: float
    priority: str
    priorityConfidence: float
    keywords: list[str]
    emergencyIndicators: list[str]

DEPARTMENT_KEYWORDS = {
    'Water': ['water', 'pipeline', 'leak', 'burst', 'drainage', 'sewage', 'flood', 'tap', 'supply', 'pipe'],
    'Waste': ['garbage', 'waste', 'trash', 'dump', 'overflowing', 'sanitation', 'sewage', 'cleaning'],
    'Electricity': ['electric', 'wire', 'pole', 'transformer', 'streetlight', 'power', 'sparking', 'electrical', 'light'],
    'Road': ['road', 'pothole', 'crack', 'lane', 'bridge', 'traffic', 'drain', 'surface', 'collapse']
}

PRIORITY_KEYWORDS = {
    'Critical': ['live wire', 'exposed live wire', 'electric shock', 'transformer fire', 'sparking electrical line', 'burst pipeline', 'major pipeline burst', 'flooding', 'road collapse', 'dangerous pothole', 'accident hazard', 'hazardous waste', 'dangerous waste', 'major public health hazard'],
    'High': ['water leakage', 'overflowing', 'large pothole', 'complete interruption', 'major damage', 'no power'],
    'Medium': ['streetlight', 'broken light', 'garbage accumulation', 'minor crack', 'small leak'],
    'Low': ['small crack', 'minor leakage', 'small issue', 'minor waste']
}


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', text.lower()).strip()

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/analyze', response_model=AnalysisResponse)
def analyze(req: AnalysisRequest):
    text = normalize(req.text or '')
    if not text:
        return AnalysisResponse(department='Water', departmentConfidence=0.5, priority='Medium', priorityConfidence=0.5, keywords=[], emergencyIndicators=[])

    scores = {dept: sum(1 for kw in kws if kw in text) for dept, kws in DEPARTMENT_KEYWORDS.items()}
    department = max(scores, key=scores.get)
    department_conf = min(0.95, 0.6 + (scores[department] * 0.08))

    priority = 'Medium'
    emergency = []
    for p in ['Critical', 'High', 'Medium', 'Low']:
        for kw in PRIORITY_KEYWORDS.get(p, []):
            if kw in text:
                priority = p
                if p == 'Critical':
                    emergency.append(kw)
                break
    if priority == 'Medium' and any(k in text for k in ['burst', 'major', 'danger', 'hazard']):
        priority = 'High'

    priority_conf = {'Critical': 0.93, 'High': 0.86, 'Medium': 0.74, 'Low': 0.67}.get(priority, 0.7)
    keywords = [kw for kw in text.split() if len(kw) > 3][:8]
    return AnalysisResponse(
        department=department,
        departmentConfidence=round(department_conf, 2),
        priority=priority,
        priorityConfidence=round(priority_conf, 2),
        keywords=keywords,
        emergencyIndicators=emergency
    )
