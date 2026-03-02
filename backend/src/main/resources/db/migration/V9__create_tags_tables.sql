-- V9: Create normalized tags tables
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, user_id)
);

CREATE TABLE short_url_tags (
    short_url_id UUID NOT NULL REFERENCES short_urls(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (short_url_id, tag_id)
);

CREATE INDEX idx_tags_user_id ON tags (user_id);
CREATE INDEX idx_tags_name ON tags (name);
CREATE INDEX idx_short_url_tags_tag_id ON short_url_tags (tag_id);

-- Migrate existing comma-separated tags into the new tables
INSERT INTO tags (name, user_id, created_at)
SELECT DISTINCT TRIM(LOWER(t.tag)), s.user_id, NOW()
FROM short_urls s,
     LATERAL unnest(string_to_array(s.tags, ',')) AS t(tag)
WHERE s.tags IS NOT NULL AND s.tags <> ''
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO short_url_tags (short_url_id, tag_id)
SELECT s.id, tg.id
FROM short_urls s
CROSS JOIN LATERAL unnest(string_to_array(s.tags, ',')) AS t(tag)
JOIN tags tg ON tg.name = TRIM(LOWER(t.tag)) AND tg.user_id = s.user_id
WHERE s.tags IS NOT NULL AND s.tags <> ''
ON CONFLICT DO NOTHING;

-- Drop the old tags column
ALTER TABLE short_urls DROP COLUMN tags;
