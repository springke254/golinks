-- V11: Create click_events table for detailed analytics
CREATE TABLE click_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_url_id UUID REFERENCES short_urls(id) ON DELETE SET NULL,
    slug VARCHAR(50) NOT NULL,
    ip VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    country VARCHAR(2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_click_events_slug ON click_events(slug);
CREATE INDEX idx_click_events_created_at ON click_events(created_at);
CREATE INDEX idx_click_events_slug_created ON click_events(slug, created_at);
CREATE INDEX idx_click_events_short_url_id ON click_events(short_url_id);
