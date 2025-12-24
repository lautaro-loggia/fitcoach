#!/usr/bin/env python3
"""
Script para enriquecer los ingredientes de las recetas con datos nutricionales
de la tabla de ingredients
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv
import unicodedata

# Load environment variables
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials in .env.local")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def normalize_name(name: str) -> str:
    """Normalize ingredient name for matching"""
    # Remove accents
    name = unicodedata.normalize('NFD', name)
    name = ''.join(char for char in name if unicodedata.category(char) != 'Mn')
    # Lowercase and strip
    return name.lower().strip()

def enrich_recipe_ingredients():
    print("🔧 Enriching recipe ingredients with nutritional data...\n")
    
    # First, load all ingredients from the database
    print("📥 Loading ingredients from database...")
    ingredients_response = supabase.table('ingredients').select('*').execute()
    ingredients_db = ingredients_response.data
    
    print(f"   Found {len(ingredients_db)} ingredients in database\n")
    
    # Create a lookup dict by normalized name
    ingredients_lookup = {}
    for ing in ingredients_db:
        normalized = normalize_name(ing['name'])
        ingredients_lookup[normalized] = ing
    
    # Get all recipes
    print("📥 Loading recipes...")
    recipes_response = supabase.table('recipes').select('id, name, ingredients').execute()
    recipes = recipes_response.data
    
    print(f"   Found {len(recipes)} recipes\n")
    
    updated = 0
    not_found_ingredients = set()
    errors = 0
    
    for recipe in recipes:
        if not recipe.get('ingredients') or len(recipe['ingredients']) == 0:
            continue
        
        try:
            enriched_ingredients = []
            recipe_updated = False
            
            for ing in recipe['ingredients']:
                ing_name = ing.get('ingredient_name', '')
                normalized_name = normalize_name(ing_name)
                
                # Try to find in database
                if normalized_name in ingredients_lookup:
                    db_ing = ingredients_lookup[normalized_name]
                    
                    # Update with database data
                    enriched_ing = {
                        'ingredient_code': db_ing['id'],
                        'ingredient_name': ing_name,  # Keep original name
                        'grams': ing.get('grams', 0),
                        'kcal_100g': db_ing.get('kcal_100g', 0) or 0,
                        'protein_100g': db_ing.get('protein_100g', 0) or 0,
                        'carbs_100g': db_ing.get('carbs_100g', 0) or 0,
                        'fat_100g': db_ing.get('fat_100g', 0) or 0,
                        'fiber_100g': db_ing.get('fiber_100g', 0) or 0,
                    }
                    recipe_updated = True
                else:
                    # Keep as is
                    enriched_ing = ing
                    not_found_ingredients.add(ing_name)
                
                enriched_ingredients.append(enriched_ing)
            
            # Update recipe if any ingredient was enriched
            if recipe_updated:
                supabase.table('recipes').update({
                    'ingredients': enriched_ingredients
                }).eq('id', recipe['id']).execute()
                
                updated += 1
                if updated % 50 == 0:
                    print(f"   ✅ Updated {updated} recipes...")
        
        except Exception as e:
            print(f"❌ Error updating {recipe.get('name', 'unknown')}: {str(e)}")
            errors += 1
    
    print(f"\n🎉 Enrichment complete!")
    print(f"✅ Updated: {updated}/{len(recipes)} recipes")
    print(f"❌ Errors: {errors}")
    
    if not_found_ingredients:
        print(f"\n⚠️  {len(not_found_ingredients)} unique ingredients not found in database:")
        for ing in sorted(list(not_found_ingredients))[:20]:
            print(f"   - {ing}")
        if len(not_found_ingredients) > 20:
            print(f"   ... and {len(not_found_ingredients) - 20} more")

if __name__ == '__main__':
    enrich_recipe_ingredients()
