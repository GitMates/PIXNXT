const fs = require('fs');

const data = fs.readFileSync('src/printstore/components/ProductDetailPage.jsx', 'utf8');

const printPackDetails = `
  print_pack: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/lowres/pdp_s_print-pack_01.webp",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small07.webp?ts=1780585829",
    subtitle: "Photo Collection",
    featureTitle: "Photo Collection",
    featureDesc: "A meaningful way to relive your moments, this set features 24 unique prints made of thick, quality paper with a simple white border.",
    details: [
      { name: "Pack 1", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/lowres/digitalab-print pack1webp.webp" },
      { name: "Pack 2", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/lowres/digitalab-print pack2.webp" },
      { name: "Pack 3", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/lowres/digitalab-print pack3.webp" },
      { name: "Pack 4", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/lowres/digitalab-print pack4.webp" }
    ]
  },
`;

if (!data.includes('print_pack: {')) {
  const updatedData = data.replace('panoramic_prints: {', printPackDetails + 'panoramic_prints: {');
  fs.writeFileSync('src/printstore/components/ProductDetailPage.jsx', updatedData, 'utf8');
  console.log('Added print_pack to PRODUCT_DETAILS_MAP');
} else {
  console.log('print_pack already exists in PRODUCT_DETAILS_MAP');
}
