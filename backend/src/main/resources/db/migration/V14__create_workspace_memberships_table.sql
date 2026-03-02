-- =============================================
-- V14 — Workspace memberships table
-- =============================================

CREATE TABLE workspace_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20)     NOT NULL DEFAULT 'MEMBER',
    invited_by      UUID            REFERENCES users(id),
    joined_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_workspace_memberships_workspace_user UNIQUE (workspace_id, user_id),
    CONSTRAINT chk_membership_role CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'))
);

CREATE INDEX idx_workspace_memberships_user_id ON workspace_memberships(user_id);
CREATE INDEX idx_workspace_memberships_workspace_id ON workspace_memberships(workspace_id);
CREATE INDEX idx_workspace_memberships_active ON workspace_memberships(workspace_id, is_active);
