-- =============================================
-- V13 — Workspaces table
-- =============================================

CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100)    NOT NULL,
    slug            VARCHAR(50)     NOT NULL,
    description     TEXT,
    avatar_url      TEXT,
    created_by      UUID            NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_workspaces_slug UNIQUE (slug)
);

CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_created_by ON workspaces(created_by);
