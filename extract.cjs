const fs = require('fs');

const jsxPath = 'src/pages/ClientGallery.jsx';
const cssPath = 'src/pages/ClientGallery.css';

let jsxContent = fs.readFileSync(jsxPath, 'utf8');

const classMap = new Map();
let classCounter = 1;

// Helper to add or get a class
function getClassName(tailwindClasses) {
    // Only extract if it's long enough to be worth it
    if (tailwindClasses.split(' ').length < 3 && !tailwindClasses.includes('[')) {
        return tailwindClasses; // keep it inline if it's simple
    }

    if (!classMap.has(tailwindClasses)) {
        const newClassName = `cg-style-${classCounter++}`;
        classMap.set(tailwindClasses, newClassName);
        return newClassName;
    }
    return classMap.get(tailwindClasses);
}

// 1. Extract static classNames: className="a b c"
jsxContent = jsxContent.replace(/className="([^"]+)"/g, (match, classes) => {
    // If it already looks like our generated class, skip
    if (classes.startsWith('cg-') && classes.split(' ').length === 1) return match;
    
    const newClass = getClassName(classes);
    if (newClass === classes) return match; // didn't change
    
    return `className="${newClass}"`;
});

// 2. Extract dynamic classNames (simple cases): className={`a b c ${var ? 'x' : 'y'}`}
// This is trickier, so we'll just extract the static parts if possible, or extract the whole thing if it's purely static.
// Let's find template literals inside className={...}
jsxContent = jsxContent.replace(/className=\{`([^`]+)`\}/g, (match, templateContent) => {
    // Split the template string into static parts and dynamic parts
    // We can't easily extract dynamic parts into @apply unless we create multiple classes.
    // Let's just find the static prefix.
    const parts = templateContent.split(/\$\{.*?\}/);
    // Usually the first part is a big static string.
    if (parts.length > 0 && parts[0].trim().length > 0) {
        const staticPrefix = parts[0];
        const newClass = getClassName(staticPrefix.trim());
        if (newClass !== staticPrefix.trim()) {
            return match.replace(staticPrefix, newClass + (staticPrefix.endsWith(' ') ? ' ' : ' '));
        }
    }
    return match;
});

// Generate CSS
let cssContent = `@tailwind components;

@layer components {\n`;

for (const [tailwindClasses, className] of classMap.entries()) {
    cssContent += `  .${className} {\n`;
    cssContent += `    @apply ${tailwindClasses};\n`;
    cssContent += `  }\n\n`;
}

cssContent += `}\n`;

fs.writeFileSync(jsxPath, jsxContent);
fs.writeFileSync(cssPath, cssContent);

console.log(`Extracted ${classMap.size} classes to ${cssPath}`);
