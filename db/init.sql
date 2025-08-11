-- enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- schema for our app
CREATE SCHEMA IF NOT EXISTS ta;

CREATE TABLE IF NOT EXISTS ta.documents (
  id           BIGSERIAL PRIMARY KEY,
  filename     TEXT NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ta.clauses (
  id           BIGSERIAL PRIMARY KEY,
  document_id  BIGINT NOT NULL REFERENCES ta.documents(id) ON DELETE CASCADE,
  page_number  INT,
  text         TEXT NOT NULL,
  embedding    VECTOR(384)
);

CREATE TABLE IF NOT EXISTS ta.audit_log (
  id           BIGSERIAL PRIMARY KEY,
  event        TEXT NOT NULL,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
