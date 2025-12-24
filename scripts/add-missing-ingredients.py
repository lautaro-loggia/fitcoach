#!/usr/bin/env python3
"""
Script para agregar los ingredientes faltantes a la tabla de ingredients
"""

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

# Valores nutricionales por 100g para los ingredientes faltantes
MISSING_INGREDIENTS = [
    {
        'name': 'arroz blanco cocido',
        'category': 'Carbohidratos',
        'state': 'cocido',
        'kcal_100g': 130,
        'protein_100g': 2.7,
        'carbs_100g': 28.2,
        'fat_100g': 0.3,
        'fiber_100g': 0.4,
    },
    {
        'name': 'arroz integral cocido',
        'category': 'Carbohidratos',
        'state': 'cocido',
        'kcal_100g': 112,
        'protein_100g': 2.6,
        'carbs_100g': 23.5,
        'fat_100g': 0.9,
        'fiber_100g': 1.8,
    },
    {
        'name': 'atun al natural escurrido',
        'category': 'Proteína animal',
        'state': 'listo',
        'kcal_100g': 116,
        'protein_100g': 25.5,
        'carbs_100g': 0,
        'fat_100g': 1,
        'fiber_100g': 0,
    },
    {
        'name': 'batata cocida',
        'category': 'Carbohidratos',
        'state': 'cocido',
        'kcal_100g': 90,
        'protein_100g': 2,
        'carbs_100g': 20.7,
        'fat_100g': 0.2,
        'fiber_100g': 3,
    },
    {
        'name': 'bebida vegetal sin azucar',
        'category': 'Lácteos',
        'state': 'líquido',
        'kcal_100g': 24,
        'protein_100g': 0.3,
        'carbs_100g': 1.1,
        'fat_100g': 1.3,
        'fiber_100g': 0.5,
    },
    {
        'name': 'carne magra cocida',
        'category': 'Proteína animal',
        'state': 'cocido',
        'kcal_100g': 250,
        'protein_100g': 26,
        'carbs_100g': 0,
        'fat_100g': 15,
        'fiber_100g': 0,
    },
    {
        'name': 'claras de huevo',
        'category': 'Huevos',
        'state': 'crudo',
        'kcal_100g': 52,
        'protein_100g': 11,
        'carbs_100g': 0.7,
        'fat_100g': 0.2,
        'fiber_100g': 0,
    },
    {
        'name': 'frutillas',
        'category': 'Frutas',
        'state': 'crudo',
        'kcal_100g': 32,
        'protein_100g': 0.7,
        'carbs_100g': 7.7,
        'fat_100g': 0.3,
        'fiber_100g': 2,
    },
    {
        'name': 'garbanzos cocidos',
        'category': 'Legumbres',
        'state': 'cocido',
        'kcal_100g': 164,
        'protein_100g': 8.9,
        'carbs_100g': 27.4,
        'fat_100g': 2.6,
        'fiber_100g': 7.6,
    },
    {
        'name': 'huevo entero',
        'category': 'Huevos',
        'state': 'crudo',
        'kcal_100g': 155,
        'protein_100g': 13,
        'carbs_100g': 1.1,
        'fat_100g': 11,
        'fiber_100g': 0,
    },
    {
        'name': 'lentejas cocidas',
        'category': 'Legumbres',
        'state': 'cocido',
        'kcal_100g': 116,
        'protein_100g': 9,
        'carbs_100g': 20.1,
        'fat_100g': 0.4,
        'fiber_100g': 7.9,
    },
    {
        'name': 'palta',
        'category': 'Grasas',
        'state': 'crudo',
        'kcal_100g': 160,
        'protein_100g': 2,
        'carbs_100g': 8.5,
        'fat_100g': 14.7,
        'fiber_100g': 6.7,
    },
    {
        'name': 'papa cocida',
        'category': 'Carbohidratos',
        'state': 'cocido',
        'kcal_100g': 87,
        'protein_100g': 1.9,
        'carbs_100g': 20.1,
        'fat_100g': 0.1,
        'fiber_100g': 1.8,
    },
    {
        'name': 'pasta integral cocida',
        'category': 'Carbohidratos',
        'state': 'cocido',
        'kcal_100g': 124,
        'protein_100g': 5,
        'carbs_100g': 26,
        'fat_100g': 0.5,
        'fiber_100g': 3.5,
    },
    {
        'name': 'pavo cocido',
        'category': 'Proteína animal',
        'state': 'cocido',
        'kcal_100g': 135,
        'protein_100g': 30,
        'carbs_100g': 0,
        'fat_100g': 1.5,
        'fiber_100g': 0,
    },
    {
        'name': 'pechuga de pollo cocida',
        'category': 'Proteína animal',
        'state': 'cocido',
        'kcal_100g': 165,
        'protein_100g': 31,
        'carbs_100g': 0,
        'fat_100g': 3.6,
        'fiber_100g': 0,
    },
    {
        'name': 'porotos negros cocidos',
        'category': 'Legumbres',
        'state': 'cocido',
        'kcal_100g': 132,
        'protein_100g': 8.9,
        'carbs_100g': 23.7,
        'fat_100g': 0.5,
        'fiber_100g': 8.7,
    },
    {
        'name': 'queso cottage light',
        'category': 'Lácteos',
        'state': 'listo',
        'kcal_100g': 72,
        'protein_100g': 12.4,
        'carbs_100g': 2.7,
        'fat_100g': 1,
        'fiber_100g': 0,
    },
    {
        'name': 'quinoa cocida',
        'category': 'Carbohidratos',
        'state': 'cocido',
        'kcal_100g': 120,
        'protein_100g': 4.4,
        'carbs_100g': 21.3,
        'fat_100g': 1.9,
        'fiber_100g': 2.8,
    },
    {
        'name': 'tortilla de trigo',
        'category': 'Carbohidratos',
        'state': 'listo',
        'kcal_100g': 304,
        'protein_100g': 8.2,
        'carbs_100g': 50.1,
        'fat_100g': 7.5,
        'fiber_100g': 2.8,
    },
    {
        'name': 'tempeh',
        'category': 'Proteína vegetal',
        'state': 'listo',
        'kcal_100g': 193,
        'protein_100g': 20.3,
        'carbs_100g': 7.6,
        'fat_100g': 10.8,
        'fiber_100g': 0,
    },
    {
        'name': 'whey protein',
        'category': 'Suplementos',
        'state': 'seco',
        'kcal_100g': 390,
        'protein_100g': 80,
        'carbs_100g': 5,
        'fat_100g': 5,
        'fiber_100g': 0,
    },
    {
        'name': 'yogur griego descremado',
        'category': 'Lácteos',
        'state': 'listo',
        'kcal_100g': 59,
        'protein_100g': 10.2,
        'carbs_100g': 3.6,
        'fat_100g': 0.4,
        'fiber_100g': 0,
    },
    {
        'name': 'salmon',
        'category': 'Pescados',
        'state': 'crudo',
        'kcal_100g': 208,
        'protein_100g': 20,
        'carbs_100g': 0,
        'fat_100g': 13,
        'fiber_100g': 0,
    },
]

def add_missing_ingredients():
    print("🌱 Adding missing ingredients to database...\n")
    
    added = 0
    skipped = 0
    errors = 0
    
    for ing_data in MISSING_INGREDIENTS:
        try:
            # Check if already exists
            existing = supabase.table('ingredients').select('id').eq('name', ing_data['name']).execute()
            
            if existing.data and len(existing.data) > 0:
                print(f"⏭️  {ing_data['name']} already exists")
                skipped += 1
                continue
            
            # Insert new ingredient (trainer_id = NULL for global ingredients)
            supabase.table('ingredients').insert({
                'trainer_id': None,  # Global ingredient
                'name': ing_data['name'],
                'category': ing_data['category'],
                'state': ing_data['state'],
                'kcal_100g': ing_data['kcal_100g'],
                'protein_100g': ing_data['protein_100g'],
                'carbs_100g': ing_data['carbs_100g'],
                'fat_100g': ing_data['fat_100g'],
                'fiber_100g': ing_data['fiber_100g'],
            }).execute()
            
            print(f"✅ Added: {ing_data['name']} ({ing_data['kcal_100g']} kcal)")
            added += 1
            
        except Exception as e:
            print(f"❌ Error adding {ing_data['name']}: {str(e)}")
            errors += 1
    
    print(f"\n🎉 Complete!")
    print(f"✅ Added: {added}")
    print(f"⏭️  Skipped: {skipped}")
    print(f"❌ Errors: {errors}")

if __name__ == '__main__':
    add_missing_ingredients()
