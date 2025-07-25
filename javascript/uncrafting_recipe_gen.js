import {defaultRecipeList, defaultRecipes} from './recipe_template.js'

// Configuration - matches your Python script
const EXCLUDE_TYPES = ['plank', 'dye', 'banner', 'map', 'stew', 'stripped', 'cake'];

// Item data arrays - matches your Python script
const NO_DATA = [
    "minecraft:dropper", "minecraft:dispenser", "minecraft:piston", 
    "minecraft:sticky_piston", "minecraft:bamboo_planks", "minecraft:mangrove_planks"
];

const PLANKS_DATA = [
    "minecraft:oak_planks", "minecraft:spruce_planks", "minecraft:birch_planks",
    "minecraft:jungle_planks", "minecraft:acacia_planks", "minecraft:dark_oak_planks"
];

const BOAT_DATA = [
    "minecraft:oak_boat", "minecraft:spruce_boat", "minecraft:birch_boat",
    "minecraft:jungle_boat", "minecraft:acacia_boat", "minecraft:dark_oak_boat",
    "minecraft:mangrove_boat", "minecraft:bamboo_raft", "minecraft:cherry_boat",
    "minecraft:pale_oak_boat"
];

const CHEST_BOAT_DATA = [
    "minecraft:oak_chest_boat", "minecraft:spruce_chest_boat", "minecraft:birch_chest_boat",
    "minecraft:jungle_chest_boat", "minecraft:acacia_chest_boat", "minecraft:dark_oak_chest_boat",
    "minecraft:mangrove_chest_boat", "minecraft:bamboo_raft", "minecraft:cherry_chest_boat",
    "minecraft:pale_oak_chest_boat"
];

const STONE_DATA = [
    "minecraft:stone", "minecraft:granite", "minecraft:polished_granite",
    "minecraft:diorite", "minecraft:polished_diorite", "minecraft:andesite",
    "minecraft:polished_andesite"
];

const DYE_DATA = [
    "minecraft:ink_sac", "minecraft:red_dye", "minecraft:green_dye", "minecraft:cocoa_beans",
    "minecraft:lapis_lazuli", "minecraft:purple_dye", "minecraft:cyan_dye", "minecraft:light_gray_dye",
    "minecraft:gray_dye", "minecraft:pink_dye", "minecraft:lime_dye", "minecraft:yellow_dye",
    "minecraft:light_blye_dye", "minecraft:magenta_dye", "minecraft:orange_dye", "minecraft:bone_meal",
    "minecraft:black_dye", "minecraft:brown_dye", "minecraft:blue_dye", "minecraft:white_dye"
];

const CARPET_DATA = [
    "minecraft:white_carpet", "minecraft:orange_carpet", "minecraft:magenta_carpet",
    "minecraft:light_blue_carpet", "minecraft:yellow_carpet", "minecraft:lime_carpet",
    "minecraft:pink_carpet", "minecraft:gray_carpet", "minecraft:light_gray_carpet",
    "minecraft:cyan_carpet", "minecraft:purple_carpet", "minecraft:blue_carpet",
    "minecraft:brown_carpet", "minecraft:green_carpet", "minecraft:red_carpet",
    "minecraft:black_carpet"
];

const QUARTZ_BLOCK_DATA = [
    "minecraft:quartz_block", "minecraft:chiseled_quartz_block",
    "minecraft:quartz_pillar", "minecraft:smooth_quartz_block"
];

const BUCKET_DATA = [
    "minecraft:bucket", "minecraft:milk_bucket", "minecraft:code_bucket",
    "minecraft:salmon_bucket", "minecraft:tropical_fish_bucket", "minecraft:pufferfish_bucket"
];

let currentFile = null;
let generatedContent = null;
let processingResults = {
    success: [],
    warnings: [],
    errors: []
};

// Add recipe to sidebar tracking
function addRecipeResult(filename, status, reason = '', constName = '') {
    const displayName = constName || filename.replace('.json', '');
    const result = { filename, displayName, status, reason };
    
    if (status === 'success') {
        processingResults.success.push(result);
    } else if (status === 'warning') {
        processingResults.warnings.push(result);
    } else if (status === 'error') {
        processingResults.errors.push(result);
    }
    
    updateSidebar();
}

function updateSidebar() {
    const sidebar = document.getElementById('sidebar');
    const successCount = document.getElementById('successCount');
    const warningCount = document.getElementById('warningCount');
    const errorCount = document.getElementById('errorCount');
    const recipeList = document.getElementById('recipeList');
    
    // Update counters
    successCount.textContent = processingResults.success.length;
    warningCount.textContent = processingResults.warnings.length;
    errorCount.textContent = processingResults.errors.length;
    
    // Clear and rebuild recipe list
    recipeList.innerHTML = '';
    
    // Add all results to the list
    const allResults = [
        ...processingResults.success,
        ...processingResults.warnings,
        ...processingResults.errors
    ];
    
    allResults.forEach(result => {
        const item = document.createElement('div');
        item.className = 'recipe-item';
        
        let icon, tooltipText;
        switch (result.status) {
            case 'success':
                icon = '✅';
                tooltipText = 'Successfully added to recipes.js';
                break;
            case 'warning':
                icon = '⚠️';
                tooltipText = `Skipped: ${result.reason}`;
                break;
            case 'error':
                icon = '❌';
                tooltipText = `Error: ${result.reason}`;
                break;
        }
        
        item.innerHTML = `
            <span class="recipe-icon ${result.status}">${icon}</span>
            <span class="recipe-name">${result.displayName}</span>
            <div class="recipe-tooltip">${tooltipText}</div>
        `;
        
        recipeList.appendChild(item);
    });
    
    // Show sidebar if we have results
    if (allResults.length > 0) {
        sidebar.classList.add('show');
    }
}

function clearSidebar() {
    processingResults = { success: [], warnings: [], errors: [] };
    document.getElementById('sidebar').classList.remove('show');
    updateSidebar();
}

// Utility functions - JavaScript versions of your Python functions
function camelCase(snake) {
    return snake.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

function makeConstName(identifier) {
    const name = identifier.split(':').pop();
    return camelCase(name) + 'Recipe';
}

function flattenName(itemName, itemData) {
    if (itemName === "minecraft:planks") {
        const idx = Math.min(Math.max(itemData, 0), PLANKS_DATA.length - 1);
        return PLANKS_DATA[idx];
    } else if (itemName === "minecraft:stone") {
        const idx = Math.min(Math.max(itemData, 0), STONE_DATA.length - 1);
        return STONE_DATA[idx];
    } else if (itemName === "minecraft:dye") {
        const idx = Math.min(Math.max(itemData, 0), DYE_DATA.length - 1);
        return DYE_DATA[idx];
    } else if (itemName === "minecraft:boat") {
        const idx = Math.min(Math.max(itemData, 0), BOAT_DATA.length - 1);
        return BOAT_DATA[idx];
    } else if (itemName === "minecraft:chest_boat") {
        const idx = Math.min(Math.max(itemData, 0), CHEST_BOAT_DATA.length - 1);
        return CHEST_BOAT_DATA[idx];
    } else if (itemName === "minecraft:quartz_block") {
        const idx = Math.min(Math.max(itemData, 0), QUARTZ_BLOCK_DATA.length - 1);
        return QUARTZ_BLOCK_DATA[idx];
    } else if (NO_DATA.includes(itemName)) {
        return itemName;
    } else if (itemName === "minecraft:bucket") {
        const idx = Math.min(Math.max(itemData, 0), BUCKET_DATA.length - 1);
        return BUCKET_DATA[idx];
    } else if (itemName === "minecraft:carpet") {
        const idx = Math.min(Math.max(itemData, 0), CARPET_DATA.length - 1);
        return CARPET_DATA[idx];
    }
    return null;
}

function fixName(itemName) {
    if (itemName === "minecraft:carrotonastick") {
        return "minecraft:carrot_on_a_stick";
    } else if (itemName === "minecraft:stone_crafting_materials") {
        return "minecraft:cobblestone";
    }
    return itemName;
}

function normalizeEntry(entry) {
    if (Array.isArray(entry)) {
        if (entry.length === 0) {
            throw new Error(`normalize_entry: got empty list: ${JSON.stringify(entry)}`);
        }
        entry = entry[0];
    }

    const identifier = entry.item || entry.name || entry.tag || entry.count;
    if (identifier === undefined) {
        throw new Error(`normalize_entry: no 'item'/'name'/'tag'/count in ${JSON.stringify(entry)}`);
    }
    
    return {
        name: identifier,
        data: entry.data || 0,
        count: entry.count || 1
    };
}

function normalizePattern(rawPattern) {
    let rows = [...rawPattern];
    while (rows.length < 3) {
        rows.push("");
    }
    rows = rows.slice(0, 3);
    const normalized = [];
    for (const row of rows) {
        normalized.push(row.padEnd(3, " ").slice(0, 3));
    }
    return normalized;
}

function makeShapelessPattern(ingredients) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const symbols = letters.slice(0, ingredients.length).split('');
    
    const grid = [...symbols, ...Array(9 - symbols.length).fill(' ')];
    const rows = [];
    for (let i = 0; i < 3; i++) {
        rows.push(grid.slice(i * 3, (i + 1) * 3).join(''));
    }
    return [rows, symbols];
}

function generateRecipeCode(constName, resultObj, itemsList) {
    // Process result
    if (!resultObj.name.startsWith('minecraft:') && !resultObj.name.includes(':')) {
        resultObj.name = `minecraft:${resultObj.name}`;
    }
    
    resultObj.name = fixName(resultObj.name);
    
    const flattenNameRes = flattenName(resultObj.name, resultObj.data);
    if (flattenNameRes) {
        resultObj.name = flattenNameRes;
        resultObj.data = 0;
    }
    
    const res = `{ name: "${resultObj.name}", data: ${resultObj.data}, count: ${resultObj.count} }`;
    
    // Process items
    const itemsLines = [];
    for (const it of itemsList) {
        if (it === null) {
            itemsLines.push('{ name: "minecraft:air", data: 0 }');
            continue;
        }
        
        if (!it.name.startsWith('minecraft:') && !it.name.includes(':')) {
            it.name = `minecraft:${it.name}`;
        }
        it.name = fixName(it.name);
        
        const flattenNameIt = flattenName(it.name, it.data);
        if (flattenNameIt) {
            it.name = flattenNameIt;
            it.data = 0;
        }
        
        itemsLines.push(`{ name: "${it.name}", data: ${it.data} }`);
    }
    
    const itemsBlock = "[\n    " + itemsLines.join(",\n    ") + "\n  ]";
    
    return `export const ${constName} = new Recipe({
result: ${res},
items: ${itemsBlock}
});

`;
}

// File handling
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const status = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const fileInfo = document.getElementById('fileInfo');

// Drag and drop handlers
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.name.endsWith('.zip')) {
        showStatus('Please select a ZIP file containing recipe JSON files.', 'error');
        return;
    }
    
    currentFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    fileInfo.style.display = 'block';
    processBtn.disabled = false;
    showStatus('ZIP file loaded. Click "Generate Recipes" to process.', 'info');
}

async function processFile() {
    if (!currentFile) return;
    
    processBtn.disabled = true;
    downloadBtn.style.display = 'none';
    showProgress(true);
    uploadArea.classList.add('processing');
    clearSidebar(); // Reset sidebar for new processing
    
    try {
        showStatus('Reading ZIP file...', 'info');
        setProgress(10);
        
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(currentFile);
        
        showStatus('Processing recipe files...', 'info');
        setProgress(30);
        
        const recipes = [];
        const seen = new Set();
        defaultRecipeList.replace(/[\n ]/g,"").split(",").forEach(name => seen.add(name));
        let processedCount = 0;
        const totalFiles = Object.keys(zipContent.files).filter(name => 
            !zipContent.files[name].dir && name.endsWith('.json')
        ).length;
        
        for (const [filename, file] of Object.entries(zipContent.files)) {
            if (file.dir || !filename.endsWith('.json')) continue;
            
            const shortFilename = filename.split('/').pop(); // Get just the filename without path
            
            try {
                const content = await file.async('text');
                const data = JSON.parse(content);
                
                let r, result, pattern, key, flatItems;
                
                if (data['minecraft:recipe_shaped']) {
                    r = data['minecraft:recipe_shaped'];
                } else if (data['minecraft:recipe_shapeless']) {
                    r = data['minecraft:recipe_shapeless'];
                } else {
                    addRecipeResult(shortFilename, 'warning', 'Unknown recipe type (not shaped or shapeless)');
                    processedCount++;
                    setProgress(30 + (processedCount / totalFiles) * 50);
                    continue;
                }
                
                // Check if description exists  
                if (!r.description || !r.description.identifier) {
                    addRecipeResult(shortFilename, 'error', 'Missing recipe description or identifier');
                    processedCount++;
                    setProgress(30 + (processedCount / totalFiles) * 50);
                    continue;
                }
                
                const identifier = r.description.identifier;
                const constName = makeConstName(identifier);
                
                // Check for duplicates
                if (seen.has(constName)) {
                    addRecipeResult(shortFilename, 'warning', 'Duplicate recipe name', constName);
                    processedCount++;
                    setProgress(30 + (processedCount / totalFiles) * 50);
                    continue;
                }
                
                // Check exclusions
                if (EXCLUDE_TYPES.some(type => constName.toLowerCase().includes(type))) {
                    const excludedType = EXCLUDE_TYPES.find(type => constName.toLowerCase().includes(type));
                    addRecipeResult(shortFilename, 'warning', `Excluded type: ${excludedType}`, constName);
                    processedCount++;
                    setProgress(30 + (processedCount / totalFiles) * 50);
                    continue;
                }
                
                // Check stonecutter exclusions
                if (filename.toLowerCase().includes('stonecutter') && shortFilename !== 'stonecutter.json') {
                    addRecipeResult(shortFilename, 'warning', 'Stonecutter recipe (excluded)', constName);
                    processedCount++;
                    setProgress(30 + (processedCount / totalFiles) * 50);
                    continue;
                }
                
                // Process the recipe
                if (data['minecraft:recipe_shaped']) {
                    result = normalizeEntry(r.result);
                    const raw = r.pattern;
                    pattern = normalizePattern(raw);
                    key = {};
                    for (const [sym, defn] of Object.entries(r.key)) {
                        key[sym] = normalizeEntry(defn);
                    }
                    
                    flatItems = [];
                    for (const row of pattern) {
                        for (const ch of row) {
                            if (key[ch]) {
                                flatItems.push(key[ch]);
                            } else {
                                flatItems.push(null);
                            }
                        }
                    }
                } else if (data['minecraft:recipe_shapeless']) {
                    result = normalizeEntry(r.result);
                    const ingredients = r.ingredients.map(ing => normalizeEntry(ing));
                    const [patternResult, symbols] = makeShapelessPattern(ingredients);
                    pattern = patternResult;
                    key = {};
                    for (let i = 0; i < symbols.length; i++) {
                        key[symbols[i]] = ingredients[i];
                    }
                    
                    flatItems = [];
                    for (const row of pattern) {
                        for (const ch of row) {
                            if (key[ch]) {
                                flatItems.push(key[ch]);
                            } else {
                                flatItems.push(null);
                            }
                        }
                    }
                }
                
                seen.add(constName);
                recipes.push([constName, result, flatItems]);
                addRecipeResult(shortFilename, 'success', '', constName);
                
            } catch (err) {
                console.warn(`Error processing ${shortFilename}:`, err);
                addRecipeResult(shortFilename, 'error', err.message);
            }
            
            processedCount++;
            setProgress(30 + (processedCount / totalFiles) * 50);
        }
        
        showStatus('Generating JavaScript code...', 'info');
        setProgress(85);
        
        // Generate the output
        const header = `// recipes.js
//
// ⚠️  This file is auto-generated. Do not manually edit below this line.

export class Recipe {
/**
 * @param {Object} options
 * @param {string|Object} options.result - The resulting item identifier or an object { name, data }
 * @param {string[]} [options.pattern] - Array of pattern strings (optional)
 * @param {Object.<string, string>} [options.key] - Mapping of pattern symbols to item identifiers (optional)
 * @param {Array.<string|Object>} [options.items] - Flat list of ingredient identifiers or objects { name, data }
 */
constructor({ result, pattern, key, items }) {
// Normalize result to object with name and data
if (typeof result === 'string') {
this.result = { name: result, data: 0, count: 1 };
} else {
this.result = { name: result.name, data: result.data ?? 0, count: result.count ?? 1 };
}

this.pattern = pattern;
this.key = key;

// Normalize items array entries to objects
if (Array.isArray(items)) {
this.items = items.map(entry => {
if (typeof entry === 'string') {
    return { name: entry, data: 0, count: 1 };
}
return { name: entry.name, data: entry.data ?? 0, count: entry.count ?? 1 };
});
} else {
this.items = items;
}
}

/**
 * Computes required items for this recipe
 * @returns {Array.<{name: string, data: number}> | Object.<string, number>} 
 * - If using flat items list: array of { name, data }
 * - If using pattern/key: map of item IDs to counts
 */
getRequiredItems() {
if (Array.isArray(this.items)) {
return {items: this.items, requiredAmount: this.result.count};
}

// Fallback to pattern/key computation
const counts = {};
for (const symbol in this.key) {
const itemName = this.key[symbol];
let count = 0;
for (const row of this.pattern) {
for (const char of row) {
    if (char === symbol) count++;
}
}
if (count > 0) counts[itemName] = count;
}
return counts;
}
}
// —————————————————————————————————————————————————————————————————————
//  Auto‑generated recipe instances
//  DEFAULT GENERATED RECIPES
${defaultRecipes}

//  CUSTOM RECIPES
`;
        
        const body = recipes.map(([name, res, items]) => 
            generateRecipeCode(name, res, items)
        ).join('');
        
        const namesList = recipes.map(([name]) => name).join(',\n  ');
        const footer = `// —————————————————————————————————————————————————————————————————————
const recipeList = [
${defaultRecipeList}
${namesList}
];

export { recipeList };
`;
        
        generatedContent = header + body + footer;
        
        setProgress(100);
        showStatus(`✅ Successfully generated ${recipes.length} recipes!`, 'success');
        downloadBtn.style.display = 'inline-block';
        
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        processBtn.disabled = false;
        uploadArea.classList.remove('processing');
        setTimeout(() => showProgress(false), 1000);
    }
}

function downloadFile() {
    if (!generatedContent) return;
    
    // Use text/plain MIME type to reduce security warnings
    const blob = new Blob([generatedContent], { 
        type: 'text/plain;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipes.js';
    a.rel = 'nofollow'; // Additional security attribute
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show additional instructions for Windows users
    setTimeout(() => {
        showStatus('💡 If Windows blocks the file, right-click it → Properties → Check "Unblock"', 'info');
    }, 2000);
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
}

function showProgress(show) {
    progressBar.style.display = show ? 'block' : 'none';
    if (!show) setProgress(0);
}

function setProgress(percent) {
    progressFill.style.width = `${percent}%`;
}

window.processFile = processFile;
window.downloadFile = downloadFile;