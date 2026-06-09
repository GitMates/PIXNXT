import re

with open("src/printstore/data/mockStoreData.js", "r") as f:
    content = f.read()

# I need to find MATTED_FRAME_SIZES and update it. Note the commented out stuff is at the end, so I should modify the active code at the top.
# Wait, let's use replace.
old_str = """export const MATTED_FRAME_SIZES = [
  { id: "mf_13x18", label: "13x18cm", priceModifier: 0, printSize: "8x8cm" },
  { id: "mf_20x20", label: "20x20cm", priceModifier: 10, printSize: "10x10cm" },
  { id: "mf_20x25", label: "20x25cm", priceModifier: 15, printSize: "10x10cm" },
  { id: "mf_20x30", label: "20x30cm", priceModifier: 20, printSize: "15x15cm" },
  { id: "mf_25x25", label: "25x25cm", priceModifier: 25, printSize: "15x15cm" }
];"""

new_str = """export const MATTED_FRAME_SIZES = [
  { id: "mf_13x18", label: "13x18cm", priceModifier: 0, printSize: "8x8cm" },
  { id: "mf_20x20", label: "20x20cm", priceModifier: 10, printSize: "10x10cm" },
  { id: "mf_20x25", label: "20x25cm", priceModifier: 15, printSize: "10x10cm" },
  { id: "mf_20x30", label: "20x30cm", priceModifier: 20, printSize: "15x15cm" },
  { id: "mf_25x25", label: "25x25cm", priceModifier: 25, printSize: "15x15cm" },
  { id: "mf_28x36", label: "28x36cm", priceModifier: 40, printSize: "15x15cm" }
];"""

content = content.replace(old_str, new_str)

with open("src/printstore/data/mockStoreData.js", "w") as f:
    f.write(content)

print("Done")
