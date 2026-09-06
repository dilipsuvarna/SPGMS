import csv
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline


ROOT = Path(__file__).parent
DATASET_PATH = ROOT / "data" / "dataset.csv"
MODEL_PATH = ROOT / "data" / "complaint_model.joblib"


def load_dataset():
    with DATASET_PATH.open(encoding="utf-8", newline="") as dataset_file:
        rows = list(csv.DictReader(dataset_file))
    required = {"description", "department", "priority"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError("dataset.csv must contain description, department, and priority columns")
    return rows


def train():
    rows = load_dataset()
    texts = [row["description"] for row in rows]
    departments = [row["department"] for row in rows]
    priorities = [row["priority"] for row in rows]
    stratify_labels = [f"{department}:{priority}" for department, priority in zip(departments, priorities)]
    train_texts, test_texts, train_departments, test_departments, train_priorities, test_priorities = train_test_split(
        texts, departments, priorities, test_size=0.2, random_state=42, stratify=stratify_labels
    )

    def model():
        return Pipeline([
            ("features", FeatureUnion([
                ("word", TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    min_df=2,
                    sublinear_tf=True,
                    strip_accents="unicode",
                )),
                ("character", TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    min_df=2,
                    sublinear_tf=True,
                )),
            ])),
            ("classifier", LogisticRegression(C=3.0, max_iter=2000, random_state=42)),
        ])

    department_model = model().fit(train_texts, train_departments)
    priority_model = model().fit(train_texts, train_priorities)
    department_predictions = department_model.predict(test_texts)
    priority_predictions = priority_model.predict(test_texts)

    print(f"Dataset rows: {len(rows)}")
    print(f"Department accuracy: {accuracy_score(test_departments, department_predictions):.2%}")
    print(f"Priority accuracy: {accuracy_score(test_priorities, priority_predictions):.2%}")
    print("Department report:")
    print(classification_report(test_departments, department_predictions, zero_division=0))
    print("Priority report:")
    print(classification_report(test_priorities, priority_predictions, zero_division=0))

    joblib.dump({"department": department_model, "priority": priority_model}, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    train()
