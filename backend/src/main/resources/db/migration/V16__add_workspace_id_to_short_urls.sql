-- =============================================
-- V16 — Add workspace_id to short_urls
-- =============================================

ALTER TABLE short_urls ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX idx_short_urls_workspace_id ON short_urls(workspace_id);
CREATE INDEX idx_short_urls_workspace_created ON short_urls(workspace_id, created_at);
