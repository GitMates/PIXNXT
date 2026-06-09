import re

with open("src/printstore/components/MattedFramePreview.jsx", "r") as f:
    content = f.read()

target_func = """  const parseDims = (label) => {
    if (!label) return { w: 20, h: 30 };
    const match = label.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    return match ? { w: parseFloat(match[1]), h: parseFloat(match[2]) } : { w: 20, h: 30 };
  };

  const frameDims = parseDims(selectedSize?.label || '20x30cm');
  const printDims = parseDims(selectedPrintSize || '15x15cm');"""

replacement = """  const parseDims = (label, isPrint = false, frameLabel = null) => {
    if (!label) return { w: 20, h: 30 };
    const match = label.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (!match) return { w: 20, h: 30 };
    let w = parseFloat(match[1]);
    let h = parseFloat(match[2]);

    // Apply specific overrides to match the visual designs in the mockups
    if (!isPrint) {
      if (label === '30x45cm') { w = 45; h = 30; } // Landscape frame
    } else {
      // Landscape print inside landscape frame
      if (label === '15x23cm' && frameLabel === '30x45cm') { w = 23; h = 15; }
      // Landscape print inside square frame
      if (label === '15x23cm' && frameLabel === '35x35cm') { w = 23; h = 15; }
    }
    
    return { w, h };
  };

  const frameDims = parseDims(selectedSize?.label || '20x30cm', false);
  const printDims = parseDims(selectedPrintSize || '15x15cm', true, selectedSize?.label);"""

if target_func in content:
    content = content.replace(target_func, replacement)
    print("Patched parseDims")
else:
    print("Target func not found")

with open("src/printstore/components/MattedFramePreview.jsx", "w") as f:
    f.write(content)
