from __future__ import annotations
import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.preprocessing import normalize

# Stateless transformer: same hashing for same input, no fit needed.
# We fix dimensions to 384 to match our pgvector column.
_vectorizer = HashingVectorizer(
    n_features=384,
    alternate_sign=False,   # keep values non-negative for stability
    norm=None,              # we'll handle normalization ourselves
    analyzer="word",
    ngram_range=(1, 2),
)

def embed_text(text: str) -> np.ndarray:
    # transform -> dense -> L2 normalize to make cosine ~ dot
    X = _vectorizer.transform([text])        # sparse row
    dense = X.toarray().astype("float32")    # (1, 384)
    dense = normalize(dense, norm="l2", axis=1)
    return dense[0]                          # (384,)
