from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any
import yaml

@dataclass
class Rule:
    id: str
    name: str
    must_include: List[str]
    must_include_any: List[str]

def load_rules(path: str) -> List[Rule]:
    with open(path, "r") as f:
        data = yaml.safe_load(f) or {}
    rules: List[Rule] = []
    for r in data.get("rules", []):
        rules.append(
            Rule(
                id=r["id"],
                name=r["name"],
                must_include=[s.lower() for s in r.get("must_include", [])],
                must_include_any=[s.lower() for s in r.get("must_include_any", [])],
            )
        )
    return rules

def _clause_satisfies(rule: Rule, text: str) -> bool:
    t = text.lower()
    if rule.must_include and not all(s in t for s in rule.must_include):
        return False
    if rule.must_include_any and not any(s in t for s in rule.must_include_any):
        return False
    return True

def evaluate_rules_on_clauses(rules: List[Rule], clauses: List[Dict[str, Any]]):
    """
    clauses: [{document_id:int, text:str}, ...]
    returns: mapping per rule with compliant/non-compliant doc ids
    """
    by_doc: Dict[int, List[str]] = {}
    for c in clauses:
        by_doc.setdefault(c["document_id"], []).append(c["text"])

    out: Dict[str, Dict[str, Any]] = {}
    for rule in rules:
        compliant_docs = {
            doc_id
            for doc_id, texts in by_doc.items()
            if any(_clause_satisfies(rule, t) for t in texts)
        }
        all_docs = set(by_doc.keys())
        out[rule.id] = {
            "name": rule.name,
            "compliant": sorted(compliant_docs),
            "non_compliant": sorted(all_docs - compliant_docs),
            "coverage_pct": round(100.0 * len(compliant_docs) / max(1, len(all_docs)), 1),
        }
    return out