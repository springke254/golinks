CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE short_urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,
    destination_url TEXT NOT NULL,
    title VARCHAR(255),
    tags VARCHAR(500),
    clicks_count BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_short_urls_slug UNIQUE (slug)
);

CREATE INDEX idx_short_urls_slug ON short_urls(slug);
CREATE INDEX idx_short_urls_user_id ON short_urls(user_id);
CREATE INDEX idx_short_urls_created_at ON short_urls(created_at DESC);
CREATE INDEX idx_short_urls_user_deleted_created ON short_urls(user_id, deleted, created_at DESC);
CREATE INDEX idx_short_urls_destination_url_trgm ON short_urls USING GIN (destination_url gin_trgm_ops);
CREATE INDEX idx_short_urls_slug_trgm ON short_urls USING GIN (slug gin_trgm_ops);
