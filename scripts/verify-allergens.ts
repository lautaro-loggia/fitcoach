import { checkRecipeAllergens } from '../src/lib/allergen-utils'

const mockRecipes = [
    { name: "Huevos revueltos", ingredients: ["huevo", "sal"] },
    { name: "Pan con huevo", ingredients: [{ name: "pan" }, { name: "huevo" }] },
    { name: "Ensalada mixta", ingredients: ["lechuga", "tomate"] },
    { name: "Torta de chocolate", ingredients: ["harina", "azucar", "cacao"] } // harina -> gluten
]

const testCases = [
    {
        name: "Test Huevo Allergy",
        allergens: ["huevo"],
        expected: ["huevo", "huevo", null, null]
    },
    {
        name: "Test Gluten Allergy",
        allergens: ["gluten"],
        expected: [null, "gluten", null, "gluten"] // Pan (gluten)
    },
    {
        name: "Test Multiple Allergies",
        allergens: ["huevo", "gluten"],
        expected: ["huevo", "huevo", null, "gluten"] // Returns first match
    }
]

console.log("Starting verification...")

testCases.forEach(test => {
    console.log(`\n--- ${test.name} ---`)
    mockRecipes.forEach((recipe, i) => {
        const result = checkRecipeAllergens(recipe, test.allergens)
        const expected = test.expected[i]

        const passed = result === expected || (expected && result === expected) // simple string check

        console.log(`Recipe: "${recipe.name}" | Expected: ${expected} | Got: ${result} | ${passed ? 'PASS' : 'FAIL'}`)
    })
})
