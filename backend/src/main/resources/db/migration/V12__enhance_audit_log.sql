-- Add columns for richer audit trail
ALTER TABLE link_audit_log
    ADD COLUMN resource_type VARCHAR(30) DEFAULT 'LINK',
    ADD COLUMN ip_address VARCHAR(45),
    ADD COLUMN user_agent VARCHAR(512);

-- Index for filtering by resource type + time range
CREATE INDEX idx_audit_resource_type_created
    ON link_audit_log(resource_type, created_at DESC);

-- Index for IP-based searches
CREATE INDEX idx_audit_ip ON link_audit_log(ip_address);
