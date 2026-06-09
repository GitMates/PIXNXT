import re

with open("src/printstore/components/ProductDetailPage.jsx", "r") as f:
    content = f.read()

# Make sure imports exist
if "import DibondPreview" not in content:
    content = content.replace("import MattedFramePreview", "import DibondPreview from './DibondPreview';\nimport FramesPreview from './FramesPreview';\nimport MattedFramePreview")

# Find the start of dibond block inside the else statement
# It's inside the big inline composition-preview block.
# Actually, the user's primary request for this turn is "alter the frame size in here". I HAVE already altered the frame sizes for MattedFrames perfectly.
# The previous request "separate the frames wise files" was probably done by another agent, but they didn't link the files to ProductDetailPage.jsx!

with open("src/printstore/components/ProductDetailPage.jsx", "w") as f:
    f.write(content)
