import re

with open("src/printstore/components/ProductDetailPage.jsx", "r") as f:
    content = f.read()

target = """  } else if (product.id === 'matted_frame' || product.id === 'matted_collages') {
    containerLeft = '15.15%';
    containerTop = '12.05%';
    containerWidth = '16.31%';
    containerHeight = product.id === 'matted_collages' ? '34.57%' : 'auto';
  }"""

replacement = """  } else if (product.id === 'matted_frame' || product.id === 'matted_collages') {
    if (useMediumWall) {
      containerLeft = '57.0731%';
      containerTop = '20.8875%';
      containerWidth = '14.8538%';
      containerHeight = 'auto';
    } else {
      containerLeft = '15.15%';
      containerTop = '12.05%';
      containerWidth = '16.31%';
      containerHeight = product.id === 'matted_collages' ? '34.57%' : 'auto';
    }
  }"""

if target in content:
    content = content.replace(target, replacement)
    print("Fixed matted_frame medium wall positioning")
else:
    print("Target block not found")

with open("src/printstore/components/ProductDetailPage.jsx", "w") as f:
    f.write(content)
