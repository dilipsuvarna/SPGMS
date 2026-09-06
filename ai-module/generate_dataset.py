import csv
import random
from pathlib import Path


DEPARTMENTS = {
    "Electricity": {
        "subjects": [
            "street lights have stopped working along the main road",
            "a transformer is making loud sparks near the residential block",
            "the power supply has been interrupted across several houses",
            "there is no power in the house",
            "there is no electricity in our street",
            "the neighborhood has a complete power outage",
            "a broken electric pole is leaning over the public footpath",
            "an exposed cable is hanging dangerously beside the school gate",
            "the traffic signal is not receiving electricity at the junction",
            "the neighborhood has repeated voltage fluctuations every evening",
            "a streetlight remains switched off after sunset near the bus stop",
        ],
        "locations": ["Ward 12", "the market road", "the school entrance", "the apartment lane", "the bus stand", "the junction"],
    },
    "Road": {
        "subjects": [
            "a deep pothole has formed in the lane",
            "the road has a large pothole",
            "the bridge near the neighborhood has collapsed",
            "the asphalt has collapsed across one side of the road",
            "the bridge railing is broken and creates a fall hazard",
            "the pedestrian footpath is damaged and difficult to use",
            "the traffic signal is malfunctioning at the busy crossing",
            "a large crack is spreading across the carriageway",
            "a fallen tree is blocking vehicles and emergency access",
            "the road surface becomes slippery and uneven after rain",
        ],
        "locations": ["Ward 12", "the market road", "the school entrance", "the apartment lane", "the bus stand", "the junction"],
    },
    "Water": {
        "subjects": [
            "a water pipeline is leaking continuously beside the houses",
            "the entire street has had no water supply since yesterday",
            "there is no water in the neighborhood",
            "the water pipeline has burst",
            "a major pipeline has burst and water is flooding the road",
            "sewage is overflowing from a blocked drain near homes",
            "the public tap is dry and residents cannot collect water",
            "dirty water is entering houses through the damaged main",
            "waterlogging remains after rain because the drain is blocked",
            "a pipe joint is dripping and has damaged the nearby pavement",
        ],
        "locations": ["Ward 12", "the market road", "the school entrance", "the apartment lane", "the bus stand", "the junction"],
    },
    "Waste": {
        "subjects": [
            "garbage has not been collected from the residential lane",
            "there is garbage piled up near the houses",
            "the waste collection has been missed",
            "an illegal dumping site is spreading beside the road",
            "the community bins are overflowing with household waste",
            "mixed waste is being burned near the apartment entrance",
            "plastic litter and refuse are blocking the public walkway",
            "the waste collection vehicle has missed several scheduled visits",
            "a large pile of rubbish is attracting stray animals and insects",
            "the sanitation area has a persistent foul smell and scattered trash",
        ],
        "locations": ["Ward 12", "the market road", "the school entrance", "the apartment lane", "the bus stand", "the junction"],
    },
}

PRIORITIES = {
    "Low": [
        "The issue is minor, affects a small area, and does not present an immediate danger.",
        "Residents request routine maintenance because the inconvenience is currently limited.",
        "The problem is noticeable but services are still available and nobody is at risk.",
    ],
    "Medium": [
        "The issue has continued for several days and is affecting normal daily activities.",
        "A moderate number of residents are inconvenienced and a repair is needed soon.",
        "The service is unreliable and residents are requesting attention within the normal response period.",
    ],
    "High": [
        "The problem is severe, affects many households, and is blocking normal public movement.",
        "Residents report substantial disruption and request urgent municipal intervention today.",
        "The issue is expanding and could cause property damage or a public health problem if delayed.",
    ],
    "Critical": [
        "This is an emergency with an immediate threat to life or serious injury and requires rapid response.",
        "People are in immediate danger, emergency access is affected, and the area must be secured now.",
        "The hazard is life threatening and should be handled before routine complaints.",
    ],
}

OPENINGS = [
    "Residents report that",
    "Several people have informed the ward office that",
    "A citizen complaint states that",
    "The local community has noticed that",
    "People living nearby explain that",
]

DETAILS = [
    "The problem is clearly visible and has been reported with supporting photographs.",
    "Nearby residents are requesting inspection, repair, and a status update.",
    "Children, older people, and daily commuters are particularly affected by the condition.",
    "The exact location is marked on the complaint map for the response team.",
]


def generate_dataset(row_count: int = 2400) -> tuple[Path, int]:
    if row_count < 1000 or row_count > 5000:
        raise ValueError("row_count must be between 1000 and 5000")

    random.seed(42)
    labels = [(department, priority) for department in DEPARTMENTS for priority in PRIORITIES]
    rows = []
    for index in range(row_count):
        department, priority = labels[index % len(labels)]
        info = DEPARTMENTS[department]
        subject = info["subjects"][(index * 7) % len(info["subjects"])]
        location = info["locations"][(index * 11) % len(info["locations"])]
        context = PRIORITIES[priority][(index * 5) % len(PRIORITIES[priority])]
        opening = OPENINGS[index % len(OPENINGS)]
        detail = DETAILS[(index * 3) % len(DETAILS)]
        description = f"{opening} {subject} at {location}. {context} {detail}"
        rows.append({"description": description, "department": department, "priority": priority})

    random.shuffle(rows)
    output_path = Path(__file__).parent / "data" / "dataset.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as dataset_file:
        writer = csv.DictWriter(dataset_file, fieldnames=["description", "department", "priority"])
        writer.writeheader()
        writer.writerows(rows)
    return output_path, len(rows)


if __name__ == "__main__":
    path, count = generate_dataset()
    print(f"Generated {count} labeled complaints in {path}")
