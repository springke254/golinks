-- =============================================
-- V18 - Analytics heatmap tiles + link sparklines
-- =============================================

CREATE TABLE analytics_heatmap_tiles_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,
    bucket_start TIMESTAMPTZ NOT NULL,
    country VARCHAR(2) NOT NULL,
    continent VARCHAR(16) NOT NULL,
    os_name VARCHAR(64) NOT NULL,
    device_type VARCHAR(20) NOT NULL,
    clicks BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_analytics_heatmap_tiles_hourly
        UNIQUE (owner_user_id, slug, bucket_start, country, continent, os_name, device_type)
);

CREATE INDEX idx_analytics_tiles_owner_bucket
    ON analytics_heatmap_tiles_hourly(owner_user_id, bucket_start);

CREATE INDEX idx_analytics_tiles_owner_slug_bucket
    ON analytics_heatmap_tiles_hourly(owner_user_id, slug, bucket_start);

CREATE INDEX idx_analytics_tiles_owner_country_bucket
    ON analytics_heatmap_tiles_hourly(owner_user_id, country, bucket_start);

CREATE INDEX idx_analytics_tiles_owner_continent_bucket
    ON analytics_heatmap_tiles_hourly(owner_user_id, continent, bucket_start);

CREATE INDEX idx_analytics_tiles_owner_os_bucket
    ON analytics_heatmap_tiles_hourly(owner_user_id, os_name, bucket_start);

CREATE INDEX idx_analytics_tiles_owner_device_bucket
    ON analytics_heatmap_tiles_hourly(owner_user_id, device_type, bucket_start);
