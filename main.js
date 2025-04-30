import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// DOM Elements
const cuisineSelect = document.getElementById('cuisine');
const dietSelect = document.getElementById('diet');
const timeSelect = document.getElementById('time');
const ingredientsInput = document.getElementById('ingredients');
const generateBtn = document.getElementById('generateBtn');
const randomBtn = document.getElementById('randomBtn');
const result = document.getElementById('result');

// Recipe result elements
const recipeTitle = document.getElementById('recipe-title');
const recipeTime = document.getElementById('recipe-time');
const recipeServings = document.getElementById('recipe-servings');
const recipeDifficulty = document.getElementById('recipe-difficulty');
const recipeIngredients = document.getElementById('recipe-ingredients');
const recipeSteps = document.getElementById('recipe-steps');
const recipeTips = document.getElementById('recipe-tips');

// Add cache system
const recipeCache = new Map();

// Add common ingredients list for validation
const validIngredients = new Set([
    // Vegetables
    'potato', 'tomato', 'onion', 'garlic', 'ginger', 'carrot', 'bell pepper', 'broccoli', 'cauliflower',
    'spinach', 'lettuce', 'cabbage', 'mushroom', 'eggplant', 'zucchini', 'cucumber', 'corn', 'peas',
    'green beans', 'asparagus', 'celery', 'leek', 'shallot', 'scallion', 'kale', 'arugula', 'radish',
    
    // Fruits
    'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberry', 'blueberry', 'raspberry',
    'mango', 'pineapple', 'pear', 'peach', 'plum', 'cherry', 'kiwi', 'melon', 'watermelon',
    
    // Meats
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'salmon', 'tuna', 'shrimp', 'crab',
    'lobster', 'mussel', 'clam', 'oyster', 'sausage', 'bacon', 'ham',
    
    // Dairy
    'milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'cottage cheese', 'cream cheese',
    
    // Grains
    'rice', 'pasta', 'bread', 'flour', 'oatmeal', 'quinoa', 'couscous', 'barley', 'buckwheat',
    
    // Legumes
    'lentil', 'bean', 'chickpea', 'black bean', 'kidney bean', 'pinto bean', 'soybean', 'tofu',
    
    // Nuts and Seeds
    'almond', 'walnut', 'cashew', 'peanut', 'pecan', 'hazelnut', 'pistachio', 'sunflower seed',
    'pumpkin seed', 'sesame seed', 'chia seed', 'flaxseed',
    
    // Herbs and Spices
    'basil', 'oregano', 'thyme', 'rosemary', 'parsley', 'cilantro', 'mint', 'dill', 'sage',
    'cumin', 'coriander', 'turmeric', 'paprika', 'cinnamon', 'nutmeg', 'clove', 'cardamom',
    'ginger', 'garlic powder', 'onion powder', 'chili powder', 'cayenne', 'black pepper',
    
    // Oils and Condiments
    'olive oil', 'vegetable oil', 'coconut oil', 'sesame oil', 'vinegar', 'soy sauce', 'mustard',
    'ketchup', 'mayonnaise', 'honey', 'maple syrup', 'sugar', 'salt', 'pepper'
]);

// Helper function to parse recipe response
function parseRecipeResponse(response) {
    try {
        console.log('Raw response:', response);

        // Try JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const recipe = JSON.parse(jsonMatch[0]);
                if (validateRecipe(recipe)) return recipe;
            } catch (jsonError) {}
        }

        // Try structured text
        const structured = parseStructuredTextRecipe(response);
        if (structured && validateRecipe(structured)) return structured;

        // Try Markdown
        const markdown = parseMarkdownRecipe(response);
        if (markdown && validateRecipe(markdown)) return markdown;

        // --- NEW: Try partial extraction for fallback ---
        // Try to extract at least title, ingredients, and steps
        const fallback = { title: '', time: '', servings: '', difficulty: '', ingredients: [], steps: [], tips: '' };
        // Title
        const titleMatch = response.match(/Title: ?(.+)/i);
        if (titleMatch) fallback.title = titleMatch[1].trim();
        // Ingredients
        const ingredientsSection = response.split(/Ingredients:/i)[1];
        if (ingredientsSection) {
            const ingredientsList = ingredientsSection.split(/Steps:|Instructions:/i)[0];
            fallback.ingredients = ingredientsList.split('\n').map(l => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
        }
        // Steps
        const stepsSection = response.split(/Steps:|Instructions:/i)[1];
        if (stepsSection) {
            fallback.steps = stepsSection.split('\n').map(l => l.replace(/^[0-9]+\.\s*/, '').trim()).filter(Boolean);
        }
        // If we have at least a title, ingredients, and steps, return this fallback
        if (fallback.title && fallback.ingredients.length && fallback.steps.length) return fallback;

        // Fallback: show raw response
        return { 
            title: "Could not parse recipe",
            time: "",
            servings: "",
            difficulty: "",
            ingredients: [],
            steps: [],
            tips: "",
            raw: response // Show raw for debugging
        };
    } catch (error) {
        console.error('Error parsing recipe response:', error);
        return null;
    }
}

// Parse structured text (old logic)
function parseStructuredTextRecipe(response) {
    const lines = response.split('\n');
    const recipe = {
        title: '',
        time: '',
        servings: '',
        difficulty: '',
        ingredients: [],
        steps: [],
        tips: ''
    };
    let currentSection = '';
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        if (trimmedLine.toLowerCase().includes('title:')) {
            const parts = trimmedLine.split('title:');
            if (parts[1]) recipe.title = parts[1].trim();
        } else if (trimmedLine.toLowerCase().includes('time:')) {
            const parts = trimmedLine.split('time:');
            if (parts[1]) recipe.time = parts[1].trim();
        } else if (trimmedLine.toLowerCase().includes('servings:')) {
            const parts = trimmedLine.split('servings:');
            if (parts[1]) recipe.servings = parts[1].trim();
        } else if (trimmedLine.toLowerCase().includes('difficulty:')) {
            const parts = trimmedLine.split('difficulty:');
            if (parts[1]) recipe.difficulty = parts[1].trim();
        } else if (trimmedLine.toLowerCase().includes('ingredients:')) {
            currentSection = 'ingredients';
        } else if (trimmedLine.toLowerCase().includes('steps:') || trimmedLine.toLowerCase().includes('instructions:')) {
            currentSection = 'steps';
        } else if (trimmedLine.toLowerCase().includes('tips:')) {
            currentSection = 'tips';
        } else if (currentSection === 'ingredients' && trimmedLine) {
            const ingredient = trimmedLine.replace(/^[-•*]\s*/, '').trim();
            if (ingredient) recipe.ingredients.push(ingredient);
        } else if (currentSection === 'steps' && trimmedLine) {
            const step = trimmedLine.replace(/^[0-9]+\.\s*/, '').trim();
            if (step) recipe.steps.push(step);
        } else if (currentSection === 'tips' && trimmedLine) {
            recipe.tips += trimmedLine + ' ';
        }
    }
    recipe.tips = recipe.tips.trim();
    return recipe;
}

function cleanMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/[*#_`>]+/g, '') // Remove *, #, _, `, >
        .replace(/\\n/g, ' ')     // Replace \n with space
        .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
        .trim();
}

function parseMarkdownRecipe(response) {
    const recipe = {
        title: '',
        time: '',
        servings: '',
        difficulty: '',
        ingredients: [],
        steps: [],
        tips: ''
    };
    // Title: first ## or first bold line
    const titleMatch = response.match(/^##\s*(.+)/m) || response.match(/^\*\*(.+?)\*\*/m);
    if (titleMatch) recipe.title = cleanMarkdown(titleMatch[1]);

    // Time, Servings, Difficulty
    const timeMatch = response.match(/\*\*Time:\*\*\s*([^\n]+)/i) || response.match(/Time:\s*([^\n]+)/i);
    if (timeMatch) recipe.time = cleanMarkdown(timeMatch[1]);
    const servingsMatch = response.match(/\*\*Servings:\*\*\s*([^\n]+)/i) || response.match(/Servings:\s*([^\n]+)/i);
    if (servingsMatch) recipe.servings = cleanMarkdown(servingsMatch[1]);
    const diffMatch = response.match(/\*\*Difficulty:\*\*\s*([^\n]+)/i) || response.match(/Difficulty:\s*([^\n]+)/i);
    if (diffMatch) recipe.difficulty = cleanMarkdown(diffMatch[1]);

    // Ingredients
    const ingredientsSection = response.split(/\*\*Ingredients:\*\*|Ingredients:/i)[1];
    if (ingredientsSection) {
        const ingredientsList = ingredientsSection.split(/\*\*Steps:\*\*|Steps:|\*\*Instructions:\*\*|Instructions:/i)[0];
        const ingredientLines = ingredientsList.split('\n').filter(l => l.match(/^\s*[-*•]/));
        recipe.ingredients = ingredientLines.map(l => cleanMarkdown(l.replace(/^[-*•]\s*/, ''))).filter(Boolean);
    }

    // Steps
    const stepsSection = response.split(/\*\*Steps:\*\*|Steps:|\*\*Instructions:\*\*|Instructions:/i)[1];
    if (stepsSection) {
        const stepsList = stepsSection.split(/\*\*Tips:\*\*|Tips:/i)[0];
        const stepLines = stepsList.split('\n').filter(l => l.match(/^\s*\d+\./));
        recipe.steps = stepLines.map(l => cleanMarkdown(l.replace(/^\s*\d+\.\s*/, ''))).filter(Boolean);
    }

    // Tips
    const tipsSection = response.split(/\*\*Tips:\*\*|Tips:/i)[1];
    if (tipsSection) {
        const tipsLines = tipsSection.split('\n').filter(l => l.match(/^\s*[-*•]/) || l.trim().length > 0);
        recipe.tips = tipsLines.map(l => cleanMarkdown(l.replace(/^[-*•]\s*/, ''))).join(' ');
    }
    return recipe;
}

// Helper function to validate recipe structure
function validateRecipe(recipe) {
    return recipe &&
        typeof recipe === 'object' &&
        recipe.title && 
        recipe.time && 
        recipe.servings && 
        recipe.difficulty && 
        Array.isArray(recipe.ingredients) && 
        recipe.ingredients.length > 0 &&
        Array.isArray(recipe.steps) && 
        recipe.steps.length > 0;
}

// Function to validate ingredients
function validateIngredients(ingredients) {
    if (!ingredients) return { isValid: true, message: '' };
    
    const invalidIngredients = [];
    const ingredientList = ingredients.split(',').map(ing => ing.trim().toLowerCase());
    
    for (const ingredient of ingredientList) {
        // Skip empty ingredients
        if (!ingredient) continue;
        
        // Check minimum length
        if (ingredient.length < 3) {
            invalidIngredients.push(ingredient);
            continue;
        }
        
        let found = false;
        for (const validIng of validIngredients) {
            // Use exact matching instead of partial matching
            if (ingredient === validIng) {
                found = true;
                break;
            }
        }
        if (!found) {
            invalidIngredients.push(ingredient);
        }
    }
    
    if (invalidIngredients.length > 0) {
        return {
            isValid: false,
            message: `Invalid ingredients found: ${invalidIngredients.join(', ')}. Please enter valid food ingredients from the list.`
        };
    }
    
    return { isValid: true, message: '' };
}

// Function to generate recipe
async function generateRecipe(options) {
    try {
        // Validate inputs
        if (!options.cuisine || !options.diet || !options.time) {
            displayError("Please select cuisine, diet, and time preferences.");
            return;
        }

        // Validate ingredients
        const ingredientValidation = validateIngredients(options.ingredients);
        if (!ingredientValidation.isValid) {
            displayError(ingredientValidation.message);
            return;
        }

        // Create cache key
        const cacheKey = `${options.cuisine}-${options.diet}-${options.time}-${options.ingredients || ''}`;
        
        // Check cache first
        if (recipeCache.has(cacheKey)) {
            displayRecipe(recipeCache.get(cacheKey));
            return;
        }

        const prompt = `Generate a concise recipe with these requirements:
        Cuisine: ${options.cuisine}
        Diet: ${options.diet}
        Time: ${options.time}
        Ingredients: ${options.ingredients || 'Any'}
        
        Format:
        Title: [Name]
        Time: [Duration]
        Servings: [Number]
        Difficulty: [Level]
        
        Ingredients:
        - [List]
        
        Steps:
        1. [Steps]
        
        Tips: [Brief tips]
        
        Keep it focused on cooking instructions only.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        console.log('AI response:', responseText); // Debug log
        const recipe = parseRecipeResponse(responseText);

        if (recipe && !recipe.raw) {
            // Cache the recipe
            recipeCache.set(cacheKey, recipe);
            displayRecipe(recipe);
        } else {
            displayError("Sorry, we couldn't format the recipe. Please try again or rephrase your ingredients.");
        }
    } catch (error) {
        console.error('Error generating recipe:', error);
        displayError('Error: ' + error.message);
    }
}

// Function to display recipe
function displayRecipe(recipe) {
    try {
        if (recipe.raw) {
            displayError("Sorry, we couldn't format the recipe. Please try again or rephrase your ingredients.");
            return;
        }
        recipeTitle.textContent = recipe.title;
        recipeTime.textContent = `⏱️ ${recipe.time}`;
        recipeServings.textContent = `🍽️ ${recipe.servings}`;
        recipeDifficulty.textContent = `⭐ ${recipe.difficulty}`;

        // Clear previous content
        recipeIngredients.innerHTML = '';
        recipeSteps.innerHTML = '';
        recipeTips.innerHTML = '';

        // Add ingredients
        recipe.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            recipeIngredients.appendChild(li);
        });

        // Add steps
        recipe.steps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            recipeSteps.appendChild(li);
        });

        // Add tips
        recipeTips.textContent = recipe.tips || 'No additional tips provided.';

        // Show result section
        result.classList.remove('hidden');
    } catch (error) {
        console.error('Error displaying recipe:', error);
        displayError('Error displaying recipe. Please try again.');
    }
}

// Function to display error
function displayError(message) {
    result.innerHTML = `<div class="error">${message}</div>`;
    result.classList.remove('hidden');
}

// Function to get random options
function getRandomOptions() {
    const cuisines = ['italian', 'indian', 'mexican', 'chinese', 'mediterranean'];
    const diets = ['vegetarian', 'vegan', 'gluten-free', 'keto'];
    const times = ['quick', 'medium', 'long'];

    return {
        cuisine: cuisines[Math.floor(Math.random() * cuisines.length)],
        diet: diets[Math.floor(Math.random() * diets.length)],
        time: times[Math.floor(Math.random() * times.length)],
        ingredients: ingredientsInput.value.trim()
    };
}

// Event Listeners
generateBtn.addEventListener('click', () => {
    const options = {
        cuisine: cuisineSelect.value,
        diet: dietSelect.value,
        time: timeSelect.value,
        ingredients: ingredientsInput.value.trim()
    };
    generateRecipe(options);
});

randomBtn.addEventListener('click', () => {
    const randomOptions = getRandomOptions();
    generateRecipe(randomOptions);
});

// Add event listener for showing valid ingredients
const showIngredientsBtn = document.getElementById('showIngredientsBtn');
const validIngredientsList = document.getElementById('validIngredientsList');

showIngredientsBtn.addEventListener('click', () => {
    validIngredientsList.classList.toggle('hidden');
}); 