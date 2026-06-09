import re

with open("src/printstore/components/ProductDetailPage.jsx", "r") as f:
    content = f.read()

# 1. Update currentRoomBackground to use the medium wall for matted_frame 28x36
bg_search = """  const isExtraLargeSize = selectedSize && ['size_50x60', 'size_51x76', 'size_60x90', 'size_76x102'].includes(selectedSize.id);
  const currentRoomBackground = (product.id === 'dibond' && isLargeSize) 
    ? "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_medium02.webp?ts=1780585829" 
    : details.roomBackground;"""

bg_replace = """  const isExtraLargeSize = selectedSize && ['size_50x60', 'size_51x76', 'size_60x90', 'size_76x102'].includes(selectedSize.id);
  
  const useMediumWall = (product.id === 'dibond' && isLargeSize) || (product.id === 'matted_frame' && selectedSize?.id === 'mf_28x36');

  const currentRoomBackground = useMediumWall 
    ? "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_medium02.webp?ts=1780585829" 
    : details.roomBackground;"""

content = content.replace(bg_search, bg_replace)

# 2. Update sizeScaleFactor. The old code might look like:
# const sizeScaleFactor = (product.id === 'print_pack' || product.id === 'matted_collages') ? 1 : (currentWidthCm / baseWidthCm);
# But wait, does sizeScaleFactor affect matted_frame?
# We want the container to be the SAME WIDTH visually, but scaled up by sizeScaleFactor.
# If sizeScaleFactor is 1 for 20x20, 1 for 20x25, 1.25 for 25x25, then they scale accurately horizontally!
# BUT the user said "looks the same" for 20x20. Why?
# Maybe `containerWidth` was set to a fixed `16.31%` for `matted_frame`, and `sizeScaleFactor` IS scaling it properly!
# Oh, if it looks the same, maybe it's because MattedFramePreview isn't picking up the correct aspect ratio due to my previous script failing?
# Let's check `MattedFramePreview.jsx`.

with open("src/printstore/components/ProductDetailPage.jsx", "w") as f:
    f.write(content)

print("Done update_pdp.py")
