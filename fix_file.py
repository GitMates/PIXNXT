with open("src/printstore/components/ProductDetailPage.jsx", "r") as f:
    lines = f.readlines()

out_lines = []
in_component = False
brace_count = 0

for i, line in enumerate(lines):
    if line.startswith("// // const PRODUCT_DETAILS_MAP = {") or line.startswith("// export default function ProductDetailPage"):
        break

    out_lines.append(line)

print(f"Keeping {len(out_lines)} out of {len(lines)} lines")

with open("src/printstore/components/ProductDetailPage.jsx", "w") as f:
    f.writelines(out_lines)
