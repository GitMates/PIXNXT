const fs = require('fs');
const path = 'c:/PCfiles/PIXNXT-client-gallery/src/pages/CollectionDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add Grid Style toggle
const oldGridSettings = /<div className="px-4 py-2 text-\[11px\] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-50 mb-1">Grid Size<\/div>\s*<div className={cn\("px-4 py-2\.5 text-sm flex items-center justify-between cursor-pointer hover:bg-stone-50", gridSize === 'small' && "bg-stone-50 text-stone-900 font-semibold"\)} onClick={() => setGridSize\('small'\)}>\s*<span>Small<\/span>\s*{gridSize === 'small' && <svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"><\/polyline><\/svg>}\s*<\/div>\s*<div className={cn\("px-4 py-2\.5 text-sm flex items-center justify-between cursor-pointer hover:bg-stone-50", gridSize === 'large' && "bg-stone-50 text-stone-900 font-semibold"\)} onClick={() => setGridSize\('large'\)}>\s*<span>Large<\/span>\s*{gridSize === 'large' && <svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"><\/polyline><\/svg>}\s*<\/div>\s*<div className="h-px bg-stone-100 my-1"><\/div>/;

const newGridSettings = `<div className="px-4 py-2 text-[11px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-50 mb-1">Grid Size</div>
                                                    <div className={cn("px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer hover:bg-stone-50", gridSize === 'small' && "bg-stone-50 text-stone-900 font-semibold")} onClick={() => setGridSize('small')}>
                                                        <span>Small</span>
                                                        {gridSize === 'small' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    </div>
                                                    <div className={cn("px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer hover:bg-stone-50", gridSize === 'large' && "bg-stone-50 text-stone-900 font-semibold")} onClick={() => setGridSize('large')}>
                                                        <span>Large</span>
                                                        {gridSize === 'large' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    </div>
                                                    <div className="h-px bg-stone-100 my-1"></div>
                                                    <div className="px-4 py-2 text-[11px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-50 mb-1">Grid Style</div>
                                                    <div className={cn("px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer hover:bg-stone-50", gridSettings.style === 'vertical' && "bg-stone-50 text-stone-900 font-semibold")} onClick={() => setGridSettings(prev => ({ ...prev, style: 'vertical' }))}>
                                                        <span>Vertical</span>
                                                        {gridSettings.style === 'vertical' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    </div>
                                                    <div className={cn("px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer hover:bg-stone-50", gridSettings.style === 'horizontal' && "bg-stone-50 text-stone-900 font-semibold")} onClick={() => setGridSettings(prev => ({ ...prev, style: 'horizontal' }))}>
                                                        <span>Horizontal</span>
                                                        {gridSettings.style === 'horizontal' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    </div>
                                                    <div className="h-px bg-stone-100 my-1"></div>`;

content = content.replace(oldGridSettings, newGridSettings);

// Update Grid Rendering
const oldGridRender = /\{sortedPhotos\.length > 0 \? \(\s*<div className=\{cn\(\s*"grid gap-4 sm:gap-6",\s*gridSize === 'large' \s*\? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" \s*: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"\s*\)\}>\s*\{sortedPhotos\.map\(\(photo, index\) => \(\s*<div\s*className=\{cn\(\s*"group relative bg-white rounded transition-all",\s*selectedPhotos\.includes\(photo\.id\) \? "ring-2 ring-stone-900 shadow-md scale-\[0\.98\]" : ""\s*\)\}\s*key=\{photo\.id \|\| index\}\s*onClick=\{\(\) => togglePhotoSelection\(photo\.id\)\}\s*>\s*<div className="aspect-square bg-\[#f8f8f8\] rounded overflow-hidden flex items-center justify-center p-3">\s*<img\s*src=\{photo\.full_url\}\s*alt=\{photo\.filename \|\| `Photo \$\{index \+ 1\}`\}\s*className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-700 group-hover:scale-105"\s*\/>\s*<\/div>/;

const newGridRender = `{sortedPhotos.length > 0 ? (
                                    <div className={cn(
                                        gridSettings.style === 'horizontal' ? "flex flex-wrap" : "grid",
                                        gridSettings.style === 'horizontal' ? "gap-2 sm:gap-4" : "gap-4 sm:gap-6",
                                        gridSettings.style === 'vertical' && (
                                            gridSize === 'large' 
                                                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" 
                                                : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
                                        )
                                    )}>
                                        {sortedPhotos.map((photo, index) => (
                                            <div
                                                className={cn(
                                                    "group relative bg-white rounded transition-all",
                                                    gridSettings.style === 'horizontal' ? "flex-shrink-0" : "",
                                                    selectedPhotos.includes(photo.id) ? "ring-2 ring-stone-900 shadow-md scale-[0.98]" : ""
                                                )}
                                                style={gridSettings.style === 'horizontal' ? { 
                                                    height: gridSize === 'large' ? '280px' : '180px',
                                                    width: 'auto'
                                                } : {}}
                                                key={photo.id || index}
                                                onClick={() => togglePhotoSelection(photo.id)}
                                            >
                                                <div className={cn(
                                                    "bg-[#f8f8f8] rounded overflow-hidden",
                                                    gridSettings.style === 'horizontal' ? "h-full" : "aspect-square p-3 flex items-center justify-center"
                                                )}>
                                                    <img
                                                        src={photo.full_url}
                                                        alt={photo.filename || \`Photo \${index + 1}\`}
                                                        className={cn(
                                                            "transition-transform duration-700 group-hover:scale-105",
                                                            gridSettings.style === 'horizontal' ? "h-full w-auto object-cover" : "max-w-full max-h-full w-auto h-auto object-contain"
                                                        )}
                                                    />
                                                </div>`;

content = content.replace(oldGridRender, newGridRender);

fs.writeFileSync(path, content);
console.log('Successfully updated CollectionDashboard.jsx');
