-- Extend recipes table with new fields for full functionality
-- Add recipe_code for unique identification
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS recipe_code text UNIQUE;

-- Add meal_type
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS meal_type text CHECK (meal_type IN ('desayuno', 'almuerzo', 'cena', 'snack', 'postre'));

-- Add servings (number of portions)
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS servings integer DEFAULT 1;

-- Add prep_time_min (preparation time in minutes)
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS prep_time_min integer;

-- Add instructions
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS instructions text;

-- Add image_url for recipe photos
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS image_url text;

-- Rename ingredients_data to ingredients for consistency (if exists)
-- Note: This is a safe operation as we're adding a new column, not renaming
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS ingredients jsonb DEFAULT '[]'::jsonb;

-- Add is_base_template to identify pre-loaded recipes
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS is_base_template boolean DEFAULT false;
