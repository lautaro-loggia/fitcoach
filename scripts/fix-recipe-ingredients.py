#!/usr/bin/env python3
"""
Script para actualizar ingredientes de recetas desde el CSV
Usa ast.literal_eval() para parsear correctamente el formato Python
"""

import csv
import ast
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials in .env.local")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def normalize_ingredient_name(name: str) -> str:
    """Normalize ingredient name for ingredient_code"""
    import unicodedata
    # Remove accents
    name = unicodedata.normalize('NFD', name)
    name = ''.join(char for char in name if unicodedata.category(char) != 'Mn')
    # Convert to lowercase and replace spaces with underscores
    return name.lower().replace(' ', '_')

def update_recipe_ingredients():
    print("🔧 Updating recipe ingredients from CSV...\n")
    
    updated = 0
    errors = 0
    not_found = 0
    
    with open('orbit_recetas_500.csv', 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            recipe_id = row['recipe_id']
            name = row['name']
            ingredients_str = row['ingredients']
            
            try:
                # Parse Python literal
                ingredients_list = ast.literal_eval(ingredients_str)
                
                # Convert to our format
                ingredients_array = []
                for ing in ingredients_list:
                    ingredient_name = ing.get('ingredient', ing.get('ingredient_name', ''))
                    ingredients_array.append({
                        'ingredient_code': normalize_ingredient_name(ingredient_name),
                        'ingredient_name': ingredient_name,
                        'grams': ing.get('grams', 0),
                        'kcal_100g': 0,
                        'protein_100g': 0,
                        'carbs_100g': 0,
                        'fat_100g': 0,
                        'fiber_100g': 0,
                    })
                
                # Update in Supabase
                result = supabase.table('recipes').update({
                    'ingredients': ingredients_array
                }).eq('recipe_code', recipe_id).execute()
                
                if result.data:
                    updated += 1
                    if updated % 50 == 0:
                        print(f"   ✅ Updated {updated} recipes...")
                else:
                    not_found += 1
                    
            except Exception as e:
                print(f"❌ Error updating {name}: {str(e)}")
                errors += 1
    
    print(f"\n🎉 Update complete!")
    print(f"✅ Updated: {updated}")
    print(f"⏭️  Not found: {not_found}")
    print(f"❌ Errors: {errors}")

if __name__ == '__main__':
    update_recipe_ingredients()
