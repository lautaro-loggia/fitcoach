ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS valid_units JSONB DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN ingredients.valid_units IS 'JSONB array of valid units and their conversion to grams. Example: [{"unit": "slice", "grams": 25}] or {"slice": 25}';
