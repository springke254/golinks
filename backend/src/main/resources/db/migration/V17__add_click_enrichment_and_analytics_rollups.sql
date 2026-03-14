-- =============================================
-- V17 — Click enrichment + analytics rollups
-- =============================================

ALTER TABLE click_events
    ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN visitor_id VARCHAR(128),
    ADD COLUMN os_name VARCHAR(64),
    ADD COLUMN browser_name VARCHAR(64),
    ADD COLUMN device_type VARCHAR(20),
    ADD COLUMN region VARCHAR(120),
    ADD COLUMN city VARCHAR(120);

CREATE INDEX idx_click_events_owner_created ON click_events(owner_user_id, created_at);
CREATE INDEX idx_click_events_owner_slug_created ON click_events(owner_user_id, slug, created_at);
CREATE INDEX idx_click_events_visitor_created ON click_events(visitor_id, created_at);

CREATE TABLE analytics_heatmap_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,
    bucket_start TIMESTAMPTZ NOT NULL,
    dimension VARCHAR(20) NOT NULL,
    bucket_key VARCHAR(120) NOT NULL,
    clicks BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_analytics_heatmap_dimension
        CHECK (dimension IN ('COUNTRY', 'OS', 'DEVICE')),
    CONSTRAINT uq_analytics_heatmap_hourly
        UNIQUE (owner_user_id, slug, bucket_start, dimension, bucket_key)
);

CREATE INDEX idx_analytics_heatmap_owner_bucket ON analytics_heatmap_hourly(owner_user_id, bucket_start);
CREATE INDEX idx_analytics_heatmap_owner_dimension_bucket ON analytics_heatmap_hourly(owner_user_id, dimension, bucket_start);
CREATE INDEX idx_analytics_heatmap_slug_bucket ON analytics_heatmap_hourly(slug, bucket_start);

CREATE TABLE analytics_session_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visitor_id VARCHAR(128) NOT NULL,
    session_start TIMESTAMPTZ NOT NULL,
    session_end TIMESTAMPTZ NOT NULL,
    duration_seconds BIGINT NOT NULL,
    clicks BIGINT NOT NULL,
    entry_slug VARCHAR(50),
    exit_slug VARCHAR(50),
    os_name VARCHAR(64),
    device_type VARCHAR(20),
    country VARCHAR(2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_analytics_session_owner_visitor_start
        UNIQUE (owner_user_id, visitor_id, session_start)
);

CREATE INDEX idx_analytics_session_owner_start ON analytics_session_summary(owner_user_id, session_start DESC);
CREATE INDEX idx_analytics_session_owner_visitor_start ON analytics_session_summary(owner_user_id, visitor_id, session_start DESC);
