import re

with open("src/printstore/components/ProductDetailPage.jsx", "r") as f:
    content = f.read()

# Add import if missing
if "import MattedFramePreview" not in content:
    content = content.replace("import { CircularDeckleSvg } from './CircularDeckleSvg';", "import { CircularDeckleSvg } from './CircularDeckleSvg';\nimport MattedFramePreview from './MattedFramePreview';")

# Now inject the component routing
target = """                        ) : (
                          <div className="composition-preview\""""

replacement = """                        ) : product.id === 'matted_frame' ? (
                          <MattedFramePreview 
                            product={product} 
                            selectedFrame={selectedFrame} 
                            selectedSize={selectedSize}
                            selectedPrintSize={selectedPrintSize}
                          />
                        ) : (
                          <div className="composition-preview\""""

if target in content:
    content = content.replace(target, replacement)
    print("Injected MattedFramePreview routing")
else:
    print("Could not find target block for routing")

with open("src/printstore/components/ProductDetailPage.jsx", "w") as f:
    f.write(content)
