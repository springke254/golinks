CREATE TABLE link_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    short_url_id UUID,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_link_audit_log_user_created ON link_audit_log(user_id, created_at DESC);
CREATE INDEX idx_link_audit_log_short_url ON link_audit_log(short_url_id);
