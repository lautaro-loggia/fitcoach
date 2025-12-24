#!/usr/bin/env python3
import os, sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')
supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

final_ingredients = [
    {
        'name': 'tortitas de arroz',
        'category': 'Carbohidratos',
        'state': 'seco',
        'kcal_100g': 387,
        'protein_100g': 7.6,
        'carbs_100g': 81.5,
        'fat_100g': 2.8,
        'fiber_100g': 3.8,
    },
    {
        'name': 'zapallito',
        'category': 'Verduras',
        'state': 'crudo',
        'kcal_100g': 17,
        'protein_100g': 1.2,
        'carbs_100g': 3.1,
        'fat_100g': 0.3,
        'fiber_100g': 1,
    },
]

for ing_data in final_ingredients:
    supabase.table('ingredients').insert({
        'trainer_id': None,
        'name': ing_data['name'],
        'category': ing_data['category'],
        'state': ing_data['state'],
        'kcal_100g': ing_data['kcal_100g'],
        'protein_100g': ing_data['protein_100g'],
        'carbs_100g': ing_data['carbs_100g'],
        'fat_100g': ing_data['fat_100g'],
        'fiber_100g': ing_data['fiber_100g'],
    }).execute()
    print(f"✅ Added: {ing_data['name']}")

print("\n🎉 Complete!")
