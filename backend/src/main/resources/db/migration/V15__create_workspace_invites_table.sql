-- =============================================
-- V15 — Workspace invites table
-- =============================================

CREATE TABLE workspace_invites (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email               VARCHAR(255)    NOT NULL,
    role                VARCHAR(20)     NOT NULL DEFAULT 'MEMBER',
    token_hash          VARCHAR(64)     NOT NULL,
    expires_at          TIMESTAMPTZ     NOT NULL,
    created_by          UUID            NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    redeemed_by_user_id UUID            REFERENCES users(id),
    redeemed_at         TIMESTAMPTZ,
    revoked             BOOLEAN         NOT NULL DEFAULT false,

    CONSTRAINT uq_workspace_invites_token_hash UNIQUE (token_hash),
    CONSTRAINT chk_invite_role CHECK (role IN ('ADMIN', 'MEMBER'))
);

CREATE INDEX idx_workspace_invites_token_hash ON workspace_invites(token_hash);
CREATE INDEX idx_workspace_invites_workspace_email ON workspace_invites(workspace_id, email);
CREATE INDEX idx_workspace_invites_workspace_active ON workspace_invites(workspace_id, revoked);
