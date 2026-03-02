-- V8: Add protection fields to short_urls
ALTER TABLE short_urls ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE short_urls ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE short_urls ADD COLUMN is_one_time BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE short_urls ADD COLUMN expires_at TIMESTAMPTZ;
ALTER TABLE short_urls ADD COLUMN max_clicks INTEGER;

-- Index for expiry cleanup queries
CREATE INDEX idx_short_urls_expires_at ON short_urls (expires_at) WHERE expires_at IS NOT NULL;

-- Index for one-time link lookups
CREATE INDEX idx_short_urls_one_time ON short_urls (slug, is_active) WHERE is_one_time = true;
