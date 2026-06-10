import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Info, HelpCircle, Shield, Truck, Package, ChevronRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { MOCK_SIZES, MOCK_PAPERS, MOCK_FRAMES, MATTED_FRAME_SIZES, GALLERY_BOARD_SIZES, CIRCULAR_FRAME_SIZES } from '../data/mockStoreData';

import circularRoom from '../circular frames_files/0.webp';
import floatRoom from '../float frames_files/1.webp';
import kRoom from '../k_files/1.webp';
import { CircularDeckleSvg } from './CircularDeckleSvg';
import DibondPreview from './DibondPreview';
import FramesPreview from './FramesPreview';
import MattedFramePreview from './MattedFramePreview';

const WALL_OPTIONS = [
  { id: 'wall-1', url: '/printstore/wall1.webp' },
  { id: 'wall-2', url: '/printstore/wall2.webp' },
  { id: 'wall-3', url: '/printstore/wall3.webp' },
  { id: 'wall-4', url: '/printstore/wall4.webp' }
];

const LAYOUT_OPTIONS = [
  { id: 'layout-1', thumbnail: '/printstore/Matted Frame Collages_files/layout_lab-1_des-1997053.png', label: '2 Photos Vertical' }
];

const PRODUCT_DETAILS_MAP = {
  dibond: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/dibondprints_evkz/lowres/pdp_s_dbond_01.webp",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small02.webp",
    subtitle: "Lightweight & Durable",
    featureTitle: "Contemporary Decor Piece",
    featureDesc: "A contemporary decor piece minimalists will love, Dibond Prints are a lightweight yet durable way to display your photos — featuring a quality print adhered to eco-friendly backing made from recycled materials.",
    details: [
      { name: "Still Life", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/dibondprints_evkz/lowres/bayphoto-dibond-1.jpg" },
      { name: "Angle Edge", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/dibondprints_evkz/lowres/bayphoto-dibond-2a.jpg" },
      { name: "Corner Profile", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/dibondprints_evkz/lowres/bayphoto-dibond-3.jpg" },
      { name: "Wall Hanging", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/dibondprints_evkz/lowres/bayphoto-dibond-4.jpg" },
      { name: "Back Hanger", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/dibondprints_evkz/lowres/bayphoto-dibond-5.jpg" }
    ],
    matteDetails: [
      { name: "Matte View 1", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1001/specs/dibondprints_mluz/thumbs/sim-dibond-1.jpg" },
      { name: "Matte View 2", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1001/specs/dibondprints_mluz/thumbs/sim-dibond-3a.jpg" },
      { name: "Matte View 3", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1001/specs/dibondprints_mluz/thumbs/sim-dibond-2.jpg" },
      { name: "Matte View 4", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1001/specs/dibondprints_mluz/thumbs/sim-dibond-4.jpg" },
      { name: "Matte View 5", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1001/specs/dibondprints_mluz/thumbs/sim-dibond-6.jpg" }
    ]
  },
  matted_frame: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframes_k4l5/lowres/bayphoto-mattedframe-lightwood-1.jpg",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small02.webp",
    subtitle: "Classic & Elegant",
    featureTitle: "Iconic Mat Window Stage",
    featureDesc: "Give your photos center stage with our iconic Matted Frames. Each print is surrounded by a premium acid-free mat board and enclosed in a high-quality wooden frame, ready to hang and stand the test of time.",
    details: [
      { name: "Front View", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframes_k4l5/lowres/bayphoto-mattedframe-lightwood-1.jpg" },
      { name: "Corner Profile", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframes_k4l5/lowres/bayphoto-mattedframe-lightwood-2.jpg" },
      { name: "Backing Close", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframes_k4l5/lowres/bayphoto-mattedframe-lightwood-3.jpg" },
      { name: "Bevel Cutout", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframes_k4l5/lowres/bayphoto-mattedframe-lightwood-4.jpg" }
    ]
  },
  frames: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/frames_std_black/lowres/pdp_s_frame_lightwood_01.webp",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small02.webp",
    subtitle: "Sleek Wood Borders",
    featureTitle: "Traditional Wood Framing",
    featureDesc: "Classic wood frames complementing any quality print of your choice. Clean mitered corners, high-clarity glaze, and standard matte finishes highlight the natural grain of premium ash wood.",
    details: [
      { name: "Stand Angle", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/frames_std_black/thumbs/bayphoto-frame-black-1.jpg" },
      { name: "Miter Corner", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/frames_std_black/thumbs/bayphoto-frame-black-3.jpg" },
      { name: "Frame Side", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/frames_std_black/thumbs/bayphoto-frame-black-2.jpg" },
      { name: "Back Clip", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/frames_std_black/thumbs/bayphoto-frame-black-4.jpg" }
    ]
  },
  canvas: {
    heroImage: "https://pictime6eus1public-pub-f5djhafrcqd3djf7.a02.azurefd.net/pictures/51/748/51748702/homepage/homepage.jpg?rs=134218589898130144",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small02.webp?ts=1780585829",
    subtitle: "Textured Elegance",
    featureTitle: "Canvas",
    featureDesc: "Admired for its textured surface, this hang-ready decor features a matte surface and frameless presentation — an unforgettable way to bring your photos into the everyday.",
    details: [
      { name: "Texture Detail", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/canvas_b82g/thumbs/bay-canvas-natural-1.jpg" },
      { name: "Side View", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/canvas_b82g/thumbs/bay-canvas-natural-2.jpg" },
      { name: "Corner Angle", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/canvas_b82g/thumbs/bay-canvas-natural-3.jpg" },
      { name: "Back Frame", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/canvas_b82g/thumbs/bay-canvas-natural-4.jpg" },
      { name: "Warp Detail", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/canvas_b82g/thumbs/bay-canvas-natural-5.jpg" }
    ]
  },
  circular_frames: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/circularframes_9leb/lowres/richards-circular-frame-barnwood-1.jpg",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_medium02.webp",
    subtitle: "Modern Round Geometry",
    featureTitle: "Handtorn Round Framing",
    featureDesc: "Make a statement with a circular frame. A handtorn print is delicately centered inside a round wooden frame, drawing focus and giving your portraits an artistic, museum-grade look.",
    details: [
      { name: "Barnwood 1", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/circularframes_9leb/thumbs/richards-circular-frame-barnwood-1.jpg" },
      { name: "Barnwood 2", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/circularframes_9leb/thumbs/richards-circular-frame-barnwood-2.jpg" },
      { name: "Barnwood 3", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/circularframes_9leb/thumbs/richards-circular-frame-barnwood-3.jpg" },
      { name: "Barnwood 4", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/circularframes_9leb/thumbs/richards-circular-frame-barnwood-4.jpg" },
      { name: "Barnwood 5", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/circularframes_9leb/thumbs/richards-circular-frame-barnwood-5.jpg" }
    ]
  },
  float_frames: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/floatframes_nren/lowres/richard-classic-2.jpg",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small02.webp",
    subtitle: "Dimensional & Deep",
    featureTitle: "Elevated Floating Deckle",
    featureDesc: "A floating hand-torn print elevated in a wooden frame. Shadows cast under the hand-torn edge add striking depth, showcasing the organic texture of 100% cotton rag paper.",
    details: [
      { name: "Float Frame 1", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/floatframes_ah9e/thumbs/1.jpg" },
      { name: "Float Frame 2", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/floatframes_ah9e/thumbs/2.jpg" },
      { name: "Float Frame 3", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/floatframes_ah9e/thumbs/3.jpg" },
      { name: "Float Frame 4", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/floatframes_ah9e/thumbs/4.jpg" },
      { name: "Black Frame", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/1/specs/floatframes_ah9e/thumbs/black-frame-5.jpg" }
    ]
  },
  matted_collages: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframecollages_3emw/lowres/bayphoto-mattedframe-lightwood-1.jpg",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small02.webp?ts=1780585829",
    subtitle: "Framed Narratives",
    featureTitle: "Framed Narratives",
    featureDesc: "A unique decorative piece showcasing multiple images, Matted Frame Collages feature a crisp mat — offering a window to enjoy your photos — printed on exceptional paper and set inside a wooden frame.",
    details: [
      { name: "Front View", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframecollages_3emw/lowres/bayphoto-mattedframe-lightwood-1.jpg" },
      { name: "Corner Profile", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframecollages_3q3d/thumbs/bayphoto-mattedframe-black-3.jpg" },
      { name: "Mat Detail", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframecollages_3q3d/thumbs/bayphoto-mattedframe-black-4.jpg" }
    ],
    trioImages: [
      "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframecollages_3emw/lowres/bayphoto-mattedframe-lightwood-1.jpg",
      "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframecollages_wp25/lowres/bayphoto-mattedframe-darkwood-2.jpg",
      "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/mattedframecollages_y5c5/lowres/bayphoto-mattedframe-white-4.jpg"
    ]
  },
  gallery_board: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small04.webp",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small04.webp",
    subtitle: "Delicate yet Durable",
    featureTitle: "Delicate yet Durable",
    featureDesc: "With the option to include a classic white border or feature your photo fully, these prints are mounted for a durable photo display that's made to last.",
    details: [
      { name: "Still Life", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/galleryboards_std/lowres/bayphoto-gallery-board00001.webp" },
      { name: "Side View", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/galleryboards_std/lowres/bayphoto-gallery-board00002.webp" },
      { name: "Angle Edge", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/galleryboards_std/lowres/bay-photo-gallery-board00003.webp" },
      { name: "Corner Profile", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/galleryboards_std/lowres/bay-photo-gallery-board00004.webp" },
      { name: "Close Up", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/galleryboards_std/lowres/bayphoto-gallery-board00005.webp" }
    ]
  },
  acrylic_prints: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/acrylicprints_6dx5/lowres/pdp_hero_acrylic-prints.jpg",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small02.webp?ts=1780585829",
    subtitle: "Crisp Details",
    featureTitle: "Acrylic Prints",
    featureDesc: "Bring your photo to life with the modern clarity of an acrylic print. The crystal-clear surface sharpens every detail, delivering a bold, contemporary finish with elevated depth and dimension.",
    closeupDesc: "With stunning visual appeal, this modern display features your image set under a premium acrylic face, coveying sharp details and giving your image depth and dimension.",
    details: [
      { name: "Crisp Details", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/acrylicprints_6dx5/lowres/popup1.jpg" },
      { name: "Depth", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/acrylicprints_6dx5/lowres/popup2.jpg" },
      { name: "Mounting", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/acrylicprints_6dx5/lowres/popup3.jpg" },
      { name: "Front View", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/acrylicprints_6dx5/lowres/pdp_hero_acrylic-prints.jpg" }
    ]
  },
  prints: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/prints_semigloss/lowres/semiglosegeneral.jpg",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small06.webp?ts=1780585829",
    subtitle: "Simple & Stunning",
    featureTitle: "Simple & Stunning",
    featureDesc: "Admired for their clarity and vibrant, rich colors, these durable and long-lasting prints were designed to ensure your memories are always in view.",
    details: [
      { name: "Paper Detail", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/prints_matte/thumbs/prints_matte00002.webp" },
      { name: "Print Close", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/prints_matte/thumbs/prints_matte00003.webp" },
      { name: "Print Sample", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/prints_matte/thumbs/prints_matte00001.webp" }
    ]
  },
  deckled_prints: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/deckledprints_gknl/lowres/pdp_s_deckeld_print.webp",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small06.webp?ts=1780585829",
    subtitle: "Fine-Art Cotton Deckle",
    featureTitle: "Handtorn Edges",
    featureDesc: "Add depth and unique character to fine art prints with a delicate hand-torn deckled edge, turning your photos into gallery-worthy pieces with timeless appeal.",
    details: [
      { name: "Deckle 1", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/deckledprints_gknl/thumbs/folio-deckeld%20print-18.webp" },
      { name: "Deckle 2", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/deckledprints_gknl/thumbs/folio-deckeld%20print-1.webp" },
      { name: "Deckle 3", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/deckledprints_gknl/thumbs/folio-deckeld%20print-13.webp" },
      { name: "Deckle 4", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/deckledprints_gknl/thumbs/folio-deckeld%20print-6.webp" },
      { name: "Deckle 5", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/deckledprints_gknl/thumbs/folio-deckeld%20print-4.webp" }
    ],
    trioImages: [
      "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/deckledprints_gknl/lowres/folio-deckeld%20print-18.webp",
      "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/deckledprints_gknl/lowres/folio-deckeld%20print-1.webp",
      "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/deckledprints_gknl/lowres/folio-deckeld%20print-13.webp"
    ]
  },
  panoramic_prints: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/prints_semigloss/lowres/semiglosegeneral.jpg",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small02.webp?ts=1780585829",
    subtitle: "Wide & Breathtaking",
    featureTitle: "Panoramic Prints",
    featureDesc: "Bring sweeping landscapes and wide cinematic scenes to life with our Panoramic Prints. Produced on premium photographic paper with stunning color accuracy, these long-format prints are ideal for statement walls.",
    details: [
      { name: "Print Detail", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/prints_matte/thumbs/prints_matte00002.webp" },
      { name: "Print Close", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/prints_matte/thumbs/prints_matte00003.webp" },
      { name: "Paper Sample", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/prints_matte/thumbs/prints_matte00001.webp" }
    ]
  },
  print_pack: {
    heroImage: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/lowres/pdp_s_print-pack_01.webp",
    roomBackground: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_small07.webp?ts=1780585829",
    subtitle: "Photo Collection",
    featureTitle: "Photo Collection",
    featureDesc: "A meaningful way to relive your moments, this set features 24 unique prints made of thick, quality paper with a simple white border.",
    details: [
      { name: "Pack 1", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/thumbs/digitalab-print%20pack1webp.webp" },
      { name: "Pack 2", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/thumbs/digitalab-print%20pack2.webp" },
      { name: "Pack 3", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/thumbs/digitalab-print%20pack3.webp" },
      { name: "Pack 4", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/printpack_std/thumbs/digitalab-print%20pack4.webp" }
    ]
  }
};

const DEFAULT_FALLBACK_DETAILS = {
  heroImage: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1200&h=800",
  roomBackground: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
  subtitle: "Fine Art Photo Prints",
  featureTitle: "High-Fidelity Archival Pigment",
  featureDesc: "Top-quality photo prints in a variety of sizes to enjoy anytime. Printed on professional high-grade archival photo papers with deep tone depth and vivid color fidelity.",
  details: [
    { name: "Paper Texture", url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600&h=400" },
    { name: "Print Crispness", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
    { name: "Mat Finish", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
  ]
};

export default function ProductDetailPage({ product, onBack, onSelectPhotosForProduct }) {
  const details = PRODUCT_DETAILS_MAP[product.id] || DEFAULT_FALLBACK_DETAILS;

  const productSizes = product.id === 'matted_frame' 
    ? MATTED_FRAME_SIZES 
    : product.id === 'print_pack'
    ? PRINT_PACK_SIZES
    : product.id === 'gallery_board'
    ? GALLERY_BOARD_SIZES
    : product.id === 'circular_frames'
    ? CIRCULAR_FRAME_SIZES
    : MOCK_SIZES;
  const [selectedSize, setSelectedSize] = useState(productSizes[0]);
  const [selectedPaper, setSelectedPaper] = useState(MOCK_PAPERS[0]);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const sizeDropdownRef = useRef(null);
  const [isPaperDropdownOpen, setIsPaperDropdownOpen] = useState(false);
  const paperDropdownRef = useRef(null);
  const [selectedPrintSize, setSelectedPrintSize] = useState(
    product.id === 'matted_frame' 
      ? MATTED_FRAME_SIZES[0].printSize 
      : product.id === 'gallery_board'
      ? GALLERY_BOARD_SIZES[0].printSize
      : null
  );
  const [isPrintSizeDropdownOpen, setIsPrintSizeDropdownOpen] = useState(false);
  const printSizeDropdownRef = useRef(null);
  const [selectedFrame, setSelectedFrame] = useState(
    product.id === 'float_frames' ? MOCK_FRAMES[5] : MOCK_FRAMES.find(f => f.id === 'frame_light_wood') || MOCK_FRAMES[0]
  );
  const [selectedWall, setSelectedWall] = useState(WALL_OPTIONS[0]);
  const [selectedLayout, setSelectedLayout] = useState(LAYOUT_OPTIONS[0]);
  const [selectedBorder, setSelectedBorder] = useState('none'); // 'none' | 'white'
  
  const [activePreviewType, setActivePreviewType] = useState('room');
  const [activePreviewTab, setActivePreviewTab] = useState('wall');

  const isRoomPreview = activePreviewType === 'room';
  
  const [openAccordions, setOpenAccordions] = useState({ info: true, shipping: false });
  const [activeTrioIndex, setActiveTrioIndex] = useState(0);

  const configuratorRef = useRef(null);
  const mediaRef = useRef(null);
  
  const [compositionWidth, setCompositionWidth] = useState(152.8);
  const resizeObserverRef = useRef(null);
  const containerRef = useCallback((node) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setCompositionWidth(entry.contentRect.width);
        }
      });
      observer.observe(node);
      resizeObserverRef.current = observer;
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target)) {
        setIsSizeDropdownOpen(false);
      }
      if (paperDropdownRef.current && !paperDropdownRef.current.contains(event.target)) {
        setIsPaperDropdownOpen(false);
      }
      if (printSizeDropdownRef.current && !printSizeDropdownRef.current.contains(event.target)) {
        setIsPrintSizeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Auto-sync print size when frame size changes for matted frames
  useEffect(() => {
    if (product.id === 'matted_frame' && selectedSize?.printSize) {
      setSelectedPrintSize(selectedSize.printSize);
    }
  }, [selectedSize, product.id]);

  const currentPrice = product.basePrice + selectedSize.priceModifier + selectedPaper.priceModifier + ((product.id.includes('frame') || product.id.includes('collage')) && product.id !== 'panoramic_prints' ? selectedFrame.priceModifier : 0);

  const toggleAccordion = (section) => {
    const mediaEl = mediaRef.current;
    const prevTop = mediaEl ? mediaEl.getBoundingClientRect().top : null;
    
    setOpenAccordions(prev => ({ ...prev, [section]: !prev[section] }));
    
    if (mediaEl && prevTop !== null) {
      requestAnimationFrame(() => {
        const newTop = mediaEl.getBoundingClientRect().top;
        const drift = newTop - prevTop;
        if (Math.abs(drift) > 1) {
          window.scrollBy(0, drift);
        }
      });
    }
  };

  const handleStartCustomizing = () => {
    onSelectPhotosForProduct(product, {
      size: selectedSize,
      frame: selectedFrame,
      paper: selectedPaper
    });
  };

  const isLargeSize = selectedSize && !['size_20x20', 'size_20x25', 'size_20x30', 'size_25x25'].includes(selectedSize.id);
  const isExtraLargeSize = selectedSize && ['size_50x60', 'size_51x76', 'size_60x90', 'size_76x102'].includes(selectedSize.id);
  
  const mattedLargeWallSizes = [
    'mf_28x36', 'mf_30x30', 'mf_30x40', 'mf_30x45', 'mf_35x35', 
    'mf_40x40', 'mf_40x60', 'mf_50x50', 'mf_50x60', 'mf_55x76', 'mf_61x61',
    'mf_76x76', 'mf_76x102', 'mf_102x102', 'mf_102x152'
  ];
  const useLargeWall = (product.id === 'dibond' && isLargeSize) || (product.id === 'matted_frame' && mattedLargeWallSizes.includes(selectedSize?.id));

  const currentRoomBackground = useLargeWall 
    ? "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/resources/modeling_resources/pdp_bg_large02.webp?ts=1780585829" 
    : details.roomBackground;

  const getActivePreviewUrl = () => {
    if (activePreviewType === 'room') return currentRoomBackground;
    const idx = parseInt(activePreviewType.split('-')[1]);
    const activeDetails = (product.id === 'dibond' && selectedPaper?.id === 'paper_matte' && details.matteDetails)
      ? details.matteDetails
      : details.details;
    return activeDetails[idx]?.url || currentRoomBackground;
  };

  const hasFrameOptions = (product.id.includes('frame') || product.id.includes('collage') || product.id === 'frames') && product.id !== 'panoramic_prints';

  const sizeMatch = selectedSize?.label?.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  let currentWidthCm = sizeMatch ? parseFloat(sizeMatch[1]) : 20;
  let currentHeightCm = sizeMatch ? parseFloat(sizeMatch[2]) : 30;
  
  if (product.id === 'matted_frame') {
    if (selectedSize?.label === '30x45cm') {
      currentWidthCm = 45;
      currentHeightCm = 30;
    } else if (selectedSize?.label === '50x60cm') {
      currentWidthCm = 60;
      currentHeightCm = 50;
    } else if (selectedSize?.label === '55x76cm') {
      currentWidthCm = 76;
      currentHeightCm = 55;
    }
  }
  
  const currentAspect = currentWidthCm / currentHeightCm;

  let gbPrintWidth = 10;
  let gbPrintHeight = 15;
  if (product.id === 'gallery_board' && selectedPrintSize) {
    const pMatch = selectedPrintSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (pMatch) {
      gbPrintWidth = parseFloat(pMatch[1]);
      gbPrintHeight = parseFloat(pMatch[2]);
    }
  }
  const gbHorizBorder = Math.max(0, (currentWidthCm - gbPrintWidth) / 2);
  const gbVertBorder = Math.max(0, (currentHeightCm - gbPrintHeight) / 2);
  
  const gbPrintWidthPct = (gbPrintWidth / currentWidthCm) * 100;
  const gbPrintHeightPct = (gbPrintHeight / currentHeightCm) * 100;
  const gbPrintLeftPct = (gbHorizBorder / currentWidthCm) * 100;
  const gbPrintTopPct = (gbVertBorder / currentHeightCm) * 100;

  let cfPrintWidth = 20;
  let cfVisualSize = '100%';
  if (product.id === 'circular_frames') {
    const printSizeStr = selectedSize?.printSize || selectedPrintSize;
    if (printSizeStr) {
      const pMatch = printSizeStr.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
      if (pMatch) {
        cfPrintWidth = parseFloat(pMatch[1]);
      }
    }
    if (selectedSize?.label === '50x50cm' || selectedSize?.label === '61x61cm') {
      cfVisualSize = '65%'; 
    } else if (selectedSize?.label === '40x40cm') {
      cfVisualSize = '72%';
    } else if (selectedSize?.label === '35x35cm') {
      cfVisualSize = '80%';
    } else {
      cfVisualSize = '88%';
    }
  }
  const cfPrintPct = (cfPrintWidth / currentWidthCm) * 100;
  // The mat hole needs to be slightly larger than the print to show the torn edge resting on the backing board.
  // E.g. print is 20x20, mat hole is 23x23. So we add 3cm to the width for the hole size.
  const cfMatHolePct = ((cfPrintWidth + 3) / currentWidthCm) * 100;
  // Let the SVG mask be scaled by this percentage so the hole perfectly matches the print size.
  // Wait, if we scale the SVG, it will be smaller than the frame!
  // It's better to just set the print size percentage for the image. The white mat SVG might not fit properly if scaled. Let's see.

  const baseWidths = {
    gallery_board: 25,
    canvas: 30,
    circular_frames: 20,
    float_frames: 20,
    prints: 13,
    deckled_prints: 13,
    matted_frame: 20,
    frames: 20
  };
  let baseWidthCm = baseWidths[product.id] || 20;
  if (product.id === 'dibond' && isExtraLargeSize) {
    baseWidthCm = 50;
  } else if (product.id === 'dibond' && isLargeSize) {
    baseWidthCm = 25;
  }
  let sizeScaleFactor = (product.id === 'print_pack' || product.id === 'matted_collages') ? 1 : (currentWidthCm / baseWidthCm);

  if (product.id === 'matted_frame' && useLargeWall) {
    const customScales = {
      'mf_28x36': 0.50,
      'mf_30x30': 0.52,
      'mf_30x40': 0.54,
      'mf_30x45': 0.56,
      'mf_35x35': 0.58,
      'mf_40x40': 0.60,
      'mf_40x60': 0.63,
      'mf_50x50': 0.66,
      'mf_50x60': 0.69,
      'mf_55x76': 0.72,
      'mf_61x61': 0.70,
      'mf_76x76': 0.76,
      'mf_76x102': 0.80,
      'mf_102x102': 0.84,
      'mf_102x152': 0.88
    };
    if (customScales[selectedSize?.id]) {
      sizeScaleFactor = customScales[selectedSize?.id];
    }
  }

  // Positioning variables for the composition container
  let containerLeft = '14.0089%';
  let containerTop = '15.2589%';
  let containerWidth = '18.6422%';
  let containerHeight = 'auto';

  if (product.id === 'print_pack') {
    containerLeft = '58.2977%';
    containerTop = '38.4373%';
    containerWidth = '18.0647%';
    containerHeight = '26.8654%';
  } else if (product.id === 'matted_frame' || product.id === 'matted_collages') {
    if (useLargeWall) {
      containerLeft = '49.7689%';
      containerTop = '10.2542%';
      containerWidth = '23.9623%';
      containerHeight = 'auto';
    } else {
      containerLeft = '15.15%';
      containerTop = '15.05%';
      containerWidth = '16.31%';
      containerHeight = product.id === 'matted_collages' ? '34.57%' : 'auto';
    }
  } else if (product.id === 'gallery_board') {
    containerLeft = '68.0731%';
    containerTop = '20.8875%';
    containerWidth = '14.8538%';
  } else if (product.id === 'canvas') {
    containerLeft = '9.05706%';
    containerTop = '7.76236%';
    containerWidth = '28.5459%';
  } else if (product.id === 'circular_frames') {
    containerLeft = '58.2614%';
    containerTop = '26.0121%';
    containerWidth = '12.4772%';
  } else if (product.id === 'float_frames') {
    containerLeft = '14.0089%';
    containerTop = '11.7311%';
    containerWidth = '18.6422%';
  } else if (product.id === 'prints' || product.id === 'deckled_prints') {
    containerLeft = '38.1825%';
    containerTop = product.id === 'prints' ? '39.6483%' : '40.8464%';
    containerWidth = '15.875%';
  } else if (product.id === 'panoramic_prints') {
    containerLeft = '26%';
    containerTop = '10%';
    containerWidth = '13%';
  } else if (product.id === 'dibond') {
    if (isExtraLargeSize) {
      containerLeft = '50%';
      containerTop = selectedSize?.id === 'size_76x102' ? '26%' : '18%';
      containerWidth = '22%';
    } else if (isLargeSize) {
      containerLeft = '57.0731%';
      containerTop = '20.8875%';
      containerWidth = '14.8538%';
    } else {
      containerLeft = '14.0089%';
      containerTop = '15.2589%';
      containerWidth = '18.6422%';
    }
  }

  return (
    <div className="pdp-products-page">
      {/* 1. Header Bar Navigation */}
      <div className="pdp-products-page__header">
        <div className="pt-editor-header-wrapper" data-component="C-4-1-3-1">
          <div className="pt-editor-header pt-container">
            <div className="pt-editor-header__left">
              <button className="BS-5-3-3" data-component="BS-5-3-3" type="button" onClick={onBack}>
                <div className="pt-button__content">
                  <div className="pt-button__inner">
                    <svg viewBox="0 0 20 20" className="IS-7 pt-button__icon--desktop pt-button__icon--mobile" data-component="IS-7" style={{ width: '20px', height: '20px', fill: 'currentColor' }}>
                      <path d="M14.53 17.47a.75.75 0 1 1-1.06 1.06l-8-8a.75.75 0 0 1 0-1.06l8-8a.75.75 0 1 1 1.06 1.06L7.06 10l7.47 7.47Z" />
                    </svg>
                  </div>
                </div>
              </button>
              <span className="pt-editor-header__caption SF-1-4">
                <div className="pt-editor-header__caption-text">{product.name}</div>
              </span>
            </div>
            <div className="pt-editor-header__right">
              <div className="pt-editor-header__pdp-container">
                <div className="pdp-navigation-menu PDP-2-1-1">
                  <div className="pt-tabs C-4-5-4-2 pt-tabs--align-end">
                    <div className="v-slide-group v-tabs v-tabs--horizontal v-tabs--align-tabs-start v-tabs--density-default pt-tabs__tabs" role="tablist">
                      <div className="v-slide-group__container">
                        <div className="v-slide-group__content">
                          <button 
                            type="button" 
                            className={`v-btn v-tab pt-tab TAB-4-4 ${activePreviewTab === 'wall' ? 'v-slide-group-item--active v-tab--selected' : ''}`}
                            role="tab" 
                            aria-selected={activePreviewTab === 'wall'}
                            onClick={() => {
                              setActivePreviewTab('wall');
                              setActivePreviewType('room');
                            }}
                          >
                            <span className="v-btn__content">
                              <div className="pt-tab__content">
                                <div>Wall Display</div>
                              </div>
                            </span>
                          </button>
                          <button 
                            type="button" 
                            className={`v-btn v-tab pt-tab TAB-4-4 ${activePreviewTab === 'prints' ? 'v-slide-group-item--active v-tab--selected' : ''}`}
                            role="tab" 
                            aria-selected={activePreviewTab === 'prints'}
                            onClick={() => {
                              setActivePreviewTab('prints');
                              setActivePreviewType('detail-0');
                            }}
                          >
                            <span className="v-btn__content">
                              <div className="pt-tab__content">
                                <div>Prints</div>
                              </div>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pdp-products-page__content">
        {/* 2. Intro Fold */}
        {(
          <div className="pdp-intro-container">
            <div className="pdp-intro">
              <div className="pdp-intro__left-section" style={{ backgroundImage: `url(${details.heroImage})` }}>
              </div>
              <div className="pdp-intro__right-section PDP-3-1-1">
                <div className="SF-1-1">{product.name}</div>
                <div className="SF-2-1">{product.description}</div>
                <div className="SF-2-1">Starting at ₹{product.basePrice.toFixed(2)}</div>
                <div>
                  <button 
                    className="BS-2-1-4" 
                    data-component="BS-2-1-4" 
                    type="button" 
                    onClick={() => {
                      configuratorRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <div className="pt-button__content">
                      <div className="pt-button__inner">
                        <span>Start Customizing</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Closeup / Details Fold */}
        {(
          <div className="pdp-closeup PDP-5-1-1">
            <div className="pdp-closeup__inner">
              <div className="pdp-products-closeup">
                <div className="pdp-product-description PDP-3-1-1">
                  <div className="SF-1-2">{details.subtitle || details.featureTitle}</div>
                  <div className="SF-4-1">{details.closeupDesc || details.featureDesc}</div>
                </div>
              </div>

              <div className="pdp-closeup__animation">
                <div className="pt-trio-scope" data-component="PDP-5-1-1">
                  <div className="pt-trio-scope__container">
                    {(details.trioImages || details.details.map(d => d.url)).slice(0, 3).map((imgUrl, idx) => {
                      const order = [(activeTrioIndex) % 3, (activeTrioIndex + 1) % 3, (activeTrioIndex + 2) % 3];
                      let role = 'tiny';
                      if (idx === order[0]) role = 'big';
                      else if (idx === order[1]) role = 'small';
                      
                      return (
                        <div 
                          key={idx} 
                          className={`pt-trio-scope__container__image trio-role-${role}`}
                          data-role={role}
                          style={{ backgroundImage: `url(${imgUrl})` }}
                          onMouseEnter={() => {
                            if (role !== 'big') setActiveTrioIndex(idx);
                          }}
                        >
                          <div className="pt-trio-scope__image-label">{details.trioImages ? '' : (details.details[idx]?.name || '')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Configurator & Room Preview Fold */}
        <div ref={configuratorRef} className="pdp-preview-container" style={{ position: 'relative' }}>
          <div className="pdp-preview">
            
            {/* Left Column: Media Set View (Room Preview & Swiper) */}
            <div ref={mediaRef} className="pdp-preview__media-set-view">
              <div className="media-set C-4-40-1-1">
                <div className="media-set__preview" style={{ position: 'relative' }}>
                  {isRoomPreview ? (
                    <div 
                      className="media-set-preview media-set-preview--animated" 
                      key={product.id === 'matted_collages' ? selectedWall.url : currentRoomBackground}
                      style={{ 
                        backgroundImage: `url(${product.id === 'matted_collages' ? selectedWall.url : currentRoomBackground})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center' 
                      }}
                    >
                      <div ref={containerRef} className="media-set-preview__composition-container" style={{ 
                        left: containerLeft, 
                        top: containerTop, 
                        width: containerWidth, 
                        height: containerHeight, 
                        position: 'absolute',
                        transform: `scale(${sizeScaleFactor})`,
                        transformOrigin: product.id === 'matted_collages' ? 'bottom center' : 'center center',
                        transition: 'transform 0.3s ease-in-out'
                      }}>
                        {product.id === 'matted_collages' ? (
                          /* DYNAMICALLY CALCULATED AND RESPONSIVE MATTED FRAMES COLLAGE ACCORDING TO SCREEN MATRIX */
                          <div 
                            className="product-card-matted_collages" 
                            style={{ 
                              '--frame-color': selectedFrame?.color || '#111111',
                              width: '215px',
                              height: '280px',
                              transform: `scale(${compositionWidth / 215})`,
                              transformOrigin: 'top left',
                              background: selectedFrame?.color || '#111111',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'absolute',
                              top: 0,
                              left: 0
                            }}
                          >
                            <div 
                              className="matted-frame-mat" 
                              style={{ 
                                width: '183.18px', 
                                height: '243.6px', 
                                backgroundColor: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '24px 20px',
                                boxSizing: 'border-box'
                              }}
                            >
                              <div 
                                className="collage-container" 
                                style={{ 
                                  margin: 0,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px',
                                  width: '100%',
                                  height: '100%'
                                }}
                              >
                                <img
                                  src={product.image || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200"}
                                  alt=""
                                  className="collage-img"
                                  style={{
                                    width: '100%',
                                    height: 'calc(50% - 6px)',
                                    objectFit: 'cover',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)'
                                  }}
                                />
                                <img
                                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800&h=1200"
                                  alt=""
                                  className="collage-img"
                                  style={{
                                    width: '100%',
                                    height: 'calc(50% - 6px)',
                                    objectFit: 'cover',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)'
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : product.id === 'print_pack' ? (
                          <div 
                            className="product-card-print_pack wall-preview-print-pack" 
                            style={{ 
                              width: '100%',
                              height: '100%',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              background: 'transparent'
                            }}
                          >
                            <style>{`.wall-preview-print-pack.product-card-print_pack { background: transparent !important; }`}</style>
                            <div 
                              className="print-pack-container" 
                              style={{ 
                                margin: 0,
                                width: '100%',
                                height: '100%'
                              }}
                            >
                              {[0, 1, 2, 3].map((i) => (
                                <img 
                                  key={i} 
                                  src={product.image || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200"} 
                                  alt="" 
                                  className={`print-pack-img img-${i}`} 
                                />
                              ))}
                            </div>
                          </div>
                        ) : product.id === 'matted_frame' ? (
                          <MattedFramePreview 
                            product={product} 
                            selectedFrame={selectedFrame} 
                            selectedSize={selectedSize}
                            selectedPrintSize={selectedPrintSize}
                          />
                        ) : (
                          <div className="composition-preview" style={{ width: '100%', height: (product.id === 'print_pack' || product.id === 'matted_collages') ? '100%' : 'auto', position: 'relative' }}>
                            <div className="composition-preview__composition" style={{ 
                              aspectRatio: (product.id === 'matted_frame' || product.id === 'matted_collages') ? '0.783494 / 1' : product.id === 'panoramic_prints' ? '118.1 / 249.33' : `${currentAspect.toFixed(6)} / 1`, 
                              width: product.id === 'circular_frames' ? cfVisualSize : '100%', 
                              margin: '0 auto',
                              height: (product.id === 'print_pack' || product.id === 'matted_collages') ? '100%' : 'auto', 
                              position: 'relative',
                              transition: 'aspect-ratio 0.3s ease-in-out',
                              ...(product.id === 'gallery_board' && { backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }),
                              ...(product.id === 'canvas' && { clipPath: 'inset(17.28%)', borderRadius: '0.13px' }),
                              ...((product.id === 'prints') && { transform: 'rotate(-7deg)', transformOrigin: 'center center' }),
                              ...((product.id === 'deckled_prints') && { transform: 'rotate(-7deg)', transformOrigin: 'center center' })
                            }}>
                              <div className="composition-preview__printable-area" style={{ 
                                position: 'absolute',
                                ...(product.id === 'gallery_board' 
                                    ? { width: `${gbPrintWidthPct}%`, height: `${gbPrintHeightPct}%`, top: `${gbPrintTopPct}%`, left: `${gbPrintLeftPct}%` }
                                    : product.id === 'matted_frame' || product.id === 'frames'
                                    ? { width: '69.7802%', height: '76.3746%', top: '11.8127%', left: '15.1099%' }
                                    : product.id === 'circular_frames'
                                    ? { width: '80%', height: '80%', top: '10%', left: '10%', borderRadius: '50%' }
                                    : product.id === 'float_frames'
                                    ? { width: '78.6987%', height: '82.2006%', top: '8.89968%', left: '10.6507%', backgroundColor: '#ffffff' }
                                    : product.id === 'prints'
                                    ? { width: '100%', height: '100%', top: '0%', left: '0%', backgroundColor: selectedBorder === 'white' ? '#ffffff' : 'transparent', padding: selectedBorder === 'white' ? '8%' : '0', boxSizing: 'border-box' }
                                    : product.id === 'deckled_prints'
                                    ? { width: '100%', height: '100%', top: '0%', left: '0%', backgroundColor: selectedBorder === 'white' ? '#ffffff' : 'transparent', padding: selectedBorder === 'white' ? '8%' : '0', boxSizing: 'border-box' }
                                    : product.id === 'panoramic_prints'
                                    ? { width: '100%', height: '100%', top: '0%', left: '0%' }
                                    : { width: '100%', height: '100%', top: '0%', left: '0%' })
                              }}>
                                <div className="composition-preview-box" style={{ 
                                  position: 'absolute',
                                  ...(product.id === 'gallery_board'
                                      ? { width: '100%', height: '100%', top: '0%', left: '0%' }
                                      : product.id === 'matted_frame' || product.id === 'frames'
                                      ? { width: '64%', height: '68.5714%', top: '15.8095%', left: '18%' }
                                      : product.id === 'circular_frames'
                                      ? { width: '58%', height: '58%', top: '21%', left: '21%', borderRadius: '50%', overflow: 'hidden' }
                                      : product.id === 'float_frames'
                                      ? { width: '56.25%', height: '65%', top: '17.5%', left: '21.875%' }
                                      : { width: '100%', height: '100%', top: '0%', left: '0%' })
                                }}>
                                  {product.id === 'float_frames' ? (
                                    <img 
                                      src={product.image}
                                      alt=""
                                      className="float-frame-preview-photo"
                                      style={{ 
                                        position: 'absolute', 
                                        width: '100%', 
                                        height: '100%', 
                                        left: '0px', 
                                        top: '0px',
                                        objectFit: 'cover',
                                        filter: 'url(#deckled-edge) drop-shadow(3px 6px 10px rgba(0,0,0,0.22))'
                                      }}
                                    />
                                  ) : product.id === 'deckled_prints' ? (
                                    <img 
                                      src={product.image}
                                      alt=""
                                      className="deckled-print-preview-photo"
                                      style={{ 
                                        position: 'absolute', 
                                        width: '100%', 
                                        height: '100%', 
                                        left: '0px', 
                                        top: '0px',
                                        objectFit: 'cover',
                                        filter: 'url(#slight-deckled-edge) drop-shadow(2px 4px 8px rgba(0,0,0,0.18))'
                                      }}
                                    />
                                  ) : product.id === 'panoramic_prints' ? (
                                    <img
                                      src={product.image}
                                      alt="Panoramic Print"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        objectPosition: 'center center',
                                        display: 'block'
                                      }}
                                    />
                                  ) : product.id === 'circular_frames' ? null : (
                                    <div 
                                      className="composition-preview-box__image" 
                                      style={{ 
                                        position: 'absolute', 
                                        backgroundImage: `url(${product.image})`, 
                                        width: '100%', 
                                        height: '100%', 
                                        left: '0px', 
                                        top: '0px',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center center'
                                      }}
                                    ></div>
                                  )}
                                </div>
                              </div>

                              {/* Overlay renders */}
                              {product.id === 'dibond' ? (
                                <div className="dibond-print-pdp-overlay composition-preview__overlay" style={{ aspectRatio: '1 / 1', width: '100%' }}>
                                  <div style={{ position: 'absolute', width: '100%', height: '100%', top: '0%', left: '0%' }}>
                                    <div className="dibond-print-shadow"></div>
                                  </div>
                                </div>
                              ) : product.id === 'matted_frame' || product.id === 'frames' ? (
                                <div className="matted-frame-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
                                  <div className="matted-frame-shadow" style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: selectedFrame?.color || '#111111', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="matted-frame-mat" style={{ width: '84%', height: '87%', backgroundColor: '#fff' }}></div>
                                  </div>
                                </div>
                              ) : product.id === 'gallery_board' ? (
                                <div className="gallery-board-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, backgroundColor: '#fff', boxShadow: 'rgba(0, 0, 0, 0) 33px 33px 13px 0px, rgba(0, 0, 0, 0.01) 21px 21px 12px 0px, rgba(0, 0, 0, 0.05) 12px 12px 10px 0px, rgba(0, 0, 0, 0.09) 5px 5px 7px 0px, rgba(0, 0, 0, 0.1) 1px 1px 4px 0px' }}></div>
                              ) : product.id === 'circular_frames' ? (
                                <div className="product-card-circular_frames composition-preview__overlay" style={{ 
                                  '--frame-color': selectedFrame?.color || '#a89f91', 
                                  '--cf-print-size': `${cfPrintPct * 0.8}cqi`, 
                                  '--cf-mat-hole': `${cfMatHolePct * 0.8}cqi`,
                                  width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' 
                                }}>
                                  <div className="cf-outer-frame" style={{
                                    width: '100%', height: '100%',
                                    backgroundColor: 'var(--frame-color)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    position: 'relative',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                    <div className="cf-square-mat" style={{
                                      width: '94%', height: '94%',
                                      backgroundColor: '#f9f9f9',
                                      border: '1px solid rgba(0,0,0,0.08)',
                                      boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1)',
                                      position: 'relative',
                                      overflow: 'hidden',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                      <div className="cf-photo-container" style={{
                                        width: 'var(--cf-print-size, 50cqi)',
                                        height: 'var(--cf-print-size, 50cqi)',
                                        position: 'absolute', zIndex: 1
                                      }}>
                                        <img src={product.image} alt="" style={{
                                          width: '100%', height: '100%',
                                          objectFit: 'cover',
                                          borderRadius: '50%',
                                          border: '2.5cqi solid #ffffff',
                                          filter: 'url(#deckled-edge) drop-shadow(2px 5px 8px rgba(0,0,0,0.15))'
                                        }} />
                                      </div>
                                      <div className="cf-mat-hole" style={{
                                        width: 'var(--cf-mat-hole, 58cqi)',
                                        height: 'var(--cf-mat-hole, 58cqi)',
                                        borderRadius: '50%',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        position: 'absolute', zIndex: 2, pointerEvents: 'none',
                                        boxShadow: '0 0 0 2000px #f9f9f9, inset 0 2px 6px rgba(0,0,0,0.12), inset 0 1px 3px rgba(0,0,0,0.08)'
                                      }}></div>
                                    </div>
                                  </div>
                                </div>
                              ) : product.id === 'canvas' ? (
                                <div className="canvas-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, scale: isRoomPreview ? '0.654443' : '1', borderRadius: '0.13px', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 15px 16px 3px, rgba(0, 0, 0, 0.06) 0px 0px 7px 3px, rgba(0, 0, 0, 0.25) -1px -1px 3px 0px inset, rgba(0, 0, 0, 0.1) 1px 1px 1px 0px inset, rgba(255, 255, 255, 0.25) 3.5px 3.5px 1px 0px inset', overflow: 'hidden' }}></div>
                              ) : product.id === 'acrylic_prints' ? (
                                <div className="acrylic-print-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}></div>
                              ) : product.id === 'prints' ? (
                                <div className="print-pdp-overlay composition-preview__overlay" style={{ 
                                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none',
                                  boxShadow: 'rgba(0,0,0,0) 33px 33px 13px 0px, rgba(0,0,0,0.01) 21px 21px 12px 0px, rgba(0,0,0,0.05) 12px 12px 10px 0px, rgba(0,0,0,0.09) 5px 5px 7px 0px, rgba(0,0,0,0.1) 1px 1px 4px 0px'
                                }}></div>
                              ) : product.id === 'panoramic_prints' ? (
                                <div className="panoramic-print-pdp-overlay composition-preview__overlay" style={{ 
                                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none',
                                  boxShadow: 'rgba(0,0,0,0) 33px 33px 13px 0px, rgba(0,0,0,0.01) 21px 21px 12px 0px, rgba(0,0,0,0.05) 12px 12px 10px 0px, rgba(0,0,0,0.09) 5px 5px 7px 0px, rgba(0,0,0,0.1) 1px 1px 4px 0px'
                                }}></div>
                              ) : product.id === 'deckled_prints' ? (
                                <div className="deckled-print-pdp-overlay composition-preview__overlay" style={{ 
                                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none'
                                }}>
                                  <div className="deckled-print-pdp-overlay__matte" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
                                    <div className="deckled-print-pdp-overlay__photo-box" style={{ position: 'absolute', top: '0%', left: '0%', width: '100%', height: '100%' }}></div>
                                  </div>
                                  <div className="deckled-print-pdp-overlay__deckle deckled-print-pdp-overlay__deckle--top"></div>
                                  <div className="deckled-print-pdp-overlay__deckle deckled-print-pdp-overlay__deckle--bottom"></div>
                                  <div className="deckled-print-pdp-overlay__deckle deckled-print-pdp-overlay__deckle--left"><div className="deckled-print-pdp-overlay__deckle-tile"></div></div>
                                  <div className="deckled-print-pdp-overlay__deckle deckled-print-pdp-overlay__deckle--right"><div className="deckled-print-pdp-overlay__deckle-tile"></div></div>
                                </div>
                              ) : product.id === 'float_frames' ? (
                                <div className="pdp-overlay-float_frames composition-preview__overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none', '--frame-color': selectedFrame?.color && selectedFrame.color !== 'transparent' ? selectedFrame.color : '#d2b48c' }}></div>
                              ) : (
                                <div className={`pdp-floating-frame-overlay pdp-overlay-${product.id} composition-preview__overlay`} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, ...(hasFrameOptions && selectedFrame?.color && { '--frame-color': selectedFrame.color }) }}>
                                  <div className="pdp-overlay-matte-board"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="media-set-preview" 
                      style={{ 
                        backgroundImage: `url(${getActivePreviewUrl()})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center', 
                        height: '100%'
                      }}
                    >
                    </div>
                  )}
                </div>

                {/* Swiper Thumbnails row */}
                <div className="media-set__swiper C-4-23-3">
                  <div className="pt-tiny-swiper">
                    <button 
                      className="pt-tiny-swiper__nav pt-tiny-swiper__prev BS-5-3-2" 
                      type="button"
                      onClick={() => {
                        if (activePreviewType === 'room') {
                          const lastIdx = details.details.length - 1;
                          setActivePreviewType(`detail-${lastIdx}`);
                          setActivePreviewTab('prints');
                        } else {
                          const idx = parseInt(activePreviewType.split('-')[1]);
                          if (idx === 0) {
                            setActivePreviewType('room');
                            setActivePreviewTab('wall');
                          } else {
                            const newIdx = idx - 1;
                            setActivePreviewType(`detail-${newIdx}`);
                            setActivePreviewTab('prints');
                          }
                        }
                      }}
                    >
                      <div className="pt-button__content">
                        <div className="pt-button__inner">
                          <svg viewBox="0 0 16 16" className="IS-5 pt-button__icon--desktop" style={{ width: '16px', height: '16px', fill: 'currentColor' }}>
                            <path d="M11.53.47a.75.75 0 0 1 0 1.06L5.06 8l6.47 6.47a.75.75 0 1 1-1.06 1.06l-7-7a.75.75 0 0 1 0-1.06l7-7a.75.75 0 0 1 1.06 0Z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                    
                    <div className="pt-tiny-swiper__content media-set__swiper--tiny">
                      {/* Thumbnail 1: Room preview (mini version of main preview) */}
                      {product.id === 'matted_collages' ? (
                        <>
                          <div
                            className={`media-set-image BS-22-1-1 ${activePreviewType === 'room' ? 'media-set-image--selected' : ''}`}
                            onClick={() => { setActivePreviewType('room'); setActivePreviewTab('wall'); }}
                            style={{ position: 'relative', cursor: 'pointer' }}
                          >
                            <div
                              className="media-set-preview"
                              style={{
                                backgroundImage: `url(${details.roomBackground})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                width: '100%',
                                height: '100%'
                              }}
                            >
                              <div className="media-set-preview__composition-container" style={{ left: '11.533%', top: '11.5106%', width: '23.594%', height: '35.7188%', position: 'absolute' }}>
                                <div style={{
                                  width: '100%', height: '100%',
                                  background: selectedFrame?.color || '#111111',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                  <div style={{ width: '82%', height: '82%', background: '#fff' }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Thumbnails 2-4: product detail images */}
                          {details.details.map((item, idx) => (
                            <div
                              key={idx}
                              className={`media-set-image BS-22-1-1 ${activePreviewType === `detail-${idx}` ? 'media-set-image--selected' : ''}`}
                              onClick={() => { setActivePreviewType(`detail-${idx}`); setActivePreviewTab('prints'); }}
                              style={{
                                cursor: 'pointer',
                                backgroundImage: `url(${item.url})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            />
                          ))}
                        </>
                      ) : product.id === 'panoramic_prints' ? (
                        <>
                          {/* First thumbnail: room background with panoramic print rendered on top */}
                          <div
                            className={`media-set-image BS-22-1-1 ${activePreviewType === 'room' ? 'media-set-image--selected' : ''}`}
                            onClick={() => { setActivePreviewType('room'); setActivePreviewTab('wall'); }}
                            style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
                          >
                            <div
                              style={{
                                backgroundImage: `url(${details.roomBackground})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                width: '100%',
                                height: '100%',
                                position: 'relative'
                              }}
                            >
                              {/* Mini panoramic print overlay on the wall thumbnail */}
                              <div style={{
                                position: 'absolute',
                                left: '10%',
                                top: '25%',
                                width: '80%',
                                height: '22%',
                                backgroundColor: '#1a1a1a',
                                backgroundImage: `url(${product.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
                              }} />
                            </div>
                          </div>
                          {/* Remaining thumbnails: product detail images */}
                          {details.details.map((item, idx) => (
                            <div
                              key={idx}
                              className={`media-set-image BS-22-1-1 ${activePreviewType === `detail-${idx}` ? 'media-set-image--selected' : ''}`}
                              onClick={() => { setActivePreviewType(`detail-${idx}`); setActivePreviewTab('prints'); }}
                              style={{ cursor: 'pointer', overflow: 'hidden' }}
                            >
                              <div className="media-set-preview-thumb-bg" style={{ backgroundImage: `url(${item.url})`, width: '100%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <>
                          <div 
                            className={`media-set-image BS-22-1-1 ${activePreviewType === 'room' ? 'media-set-image--selected' : ''}`}
                            onClick={() => {
                              setActivePreviewType('room');
                              setActivePreviewTab('wall');
                            }}
                            style={{ cursor: 'pointer', overflow: 'hidden' }}
                          >
                            <div className="media-set-preview-thumb-bg" style={{ backgroundImage: `url(${currentRoomBackground})`, width: '100%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                          </div>
                          
                          {/* Balance Product Component View Thumbnails */}
                          {(product.id === 'dibond' && selectedPaper?.id === 'paper_matte' && details.matteDetails ? details.matteDetails : details.details).map((item, idx) => (
                            <div 
                              key={idx}
                              className={`media-set-image BS-22-1-1 ${activePreviewType === `detail-${idx}` ? 'media-set-image--selected' : ''}`}
                              onClick={() => {
                                setActivePreviewType(`detail-${idx}`);
                                setActivePreviewTab('prints');
                              }}
                              style={{ cursor: 'pointer', overflow: 'hidden' }}
                            >
                              <div className="media-set-preview-thumb-bg" style={{ backgroundImage: `url(${item.url})`, width: '100%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    <button 
                      className="pt-tiny-swiper__nav pt-tiny-swiper__next BS-5-3-2" 
                      type="button"
                      onClick={() => {
                        if (activePreviewType === 'room') {
                          setActivePreviewType('detail-0');
                          setActivePreviewTab('prints');
                        } else {
                          const idx = parseInt(activePreviewType.split('-')[1]);
                          const maxIdx = details.details.length - 1;
                          if (idx === maxIdx) {
                            setActivePreviewType('room');
                            setActivePreviewTab('wall');
                          } else {
                            const newIdx = idx + 1;
                            setActivePreviewType(`detail-${newIdx}`);
                            setActivePreviewTab('prints');
                          }
                        }
                      }}
                    >
                      <div className="pt-button__content">
                        <div className="pt-button__inner">
                          <svg viewBox="0 0 16 16" className="IS-5 pt-button__icon--desktop" style={{ width: '16px', height: '16px', fill: 'currentColor' }}>
                            <path d="M4.47 15.53a.75.75 0 0 1 0-1.06L10.94 8 4.47 1.53A.75.75 0 0 1 5.53.47l7 7a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0Z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Customizer Selector panel */}
            <div className="pdp-preview__cta-container PDP-20-1-1">
              <div className="pdp-preview__cta-container-header SF-1-2">
                Style your {product.name}
              </div>
              <div className="pdp-preview__cta-container-content">
                <div className="pdp-products-form">
                  <form className="pt-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="pt-form--layout">
                      
                      <div className="pt-dropdown-input-field IF-2-2" data-component="IF-2-2" ref={sizeDropdownRef}>
                        <div className="FE-2-2">
                          <div className="FE-2-2__header">
                            <span>{product.id === 'deckled_prints' ? 'Frame Size' : 'Size'}</span>
                          </div>
                        </div>
                        <div className="pt-dropdown-input">
                          <div className={`custom-dropdown-wrapper full-width ${isSizeDropdownOpen ? 'open' : ''}`}>
                            <div 
                              className="custom-dropdown-trigger"
                              onClick={() => setIsSizeDropdownOpen(prev => !prev)}
                            >
                              <span>{selectedSize.label}</span>
                              {isSizeDropdownOpen ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                            </div>
                            {isSizeDropdownOpen && (
                              <div className="custom-dropdown-menu">
                                {productSizes.map((size) => (
                                  <div 
                                    key={size.id} 
                                    className={`custom-dropdown-item ${selectedSize.id === size.id ? 'active' : ''}`}
                                    onClick={() => {
                                      setSelectedSize(size);
                                      if (product.id === 'gallery_board' || product.id === 'matted_frame') {
                                        setSelectedPrintSize(size.printSize);
                                      }
                                      setIsSizeDropdownOpen(false);
                                    }}
                                  >
                                    {size.label}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {hasFrameOptions && !['matted_frame', 'gallery_board'].includes(product.id) && (
                        <div className="pt-dropdown-input-field IF-2-2" data-component="IF-2-2">
                          <div className="FE-2-2">
                            <div className="FE-2-2__header">
                              <span>Frame Option</span>
                            </div>
                          </div>
                          <div className="pt-dropdown-input">
                            <div className="pt-system-dropdown-wrapper full-width">
                              <select 
                                className="pdp-select-input"
                                value={selectedFrame.id}
                                onChange={(e) => {
                                  const frame = MOCK_FRAMES.find(f => f.id === e.target.value);
                                  if (frame) setSelectedFrame(frame);
                                }}
                              >
                                {MOCK_FRAMES.map((frame) => (
                                  <option key={frame.id} value={frame.id}>
                                    {frame.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {product.id !== 'deckled_prints' && (
                      <div className="pt-dropdown-input-field IF-2-2" data-component="IF-2-2" ref={product.id === 'matted_frame' ? printSizeDropdownRef : paperDropdownRef}>
                        <div className="FE-2-2">
                          <div className="FE-2-2__header">
                            <span>{['matted_frame', 'gallery_board', 'circular_frames'].includes(product.id) ? 'Print Size' : 'Paper Type'}</span>
                          </div>
                        </div>
                        <div className="pt-dropdown-input">
                          {['matted_frame', 'gallery_board', 'circular_frames'].includes(product.id) ? (
                            /* Custom white dropdown for print size */
                            <div className={`custom-dropdown-wrapper full-width ${isPrintSizeDropdownOpen ? 'open' : ''}`}>
                              <div 
                                className="custom-dropdown-trigger"
                                onClick={() => setIsPrintSizeDropdownOpen(prev => !prev)}
                              >
                                <span>{selectedPrintSize || selectedSize?.printSize || '8x8cm'}</span>
                                {isPrintSizeDropdownOpen ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                              </div>
                              {isPrintSizeDropdownOpen && (
                                <div className="custom-dropdown-menu">
                                  {/* Derive unique print sizes based on product */}
                                  {[...new Set((product.id === 'matted_frame' ? MATTED_FRAME_SIZES : product.id === 'gallery_board' ? GALLERY_BOARD_SIZES : CIRCULAR_FRAME_SIZES).map(s => s.printSize))].map((ps) => (
                                    <div 
                                      key={ps} 
                                      className={`custom-dropdown-item ${selectedPrintSize === ps ? 'active' : ''}`}
                                      onClick={() => {
                                        setSelectedPrintSize(ps);
                                        setIsPrintSizeDropdownOpen(false);
                                      }}
                                    >
                                      {ps}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`custom-dropdown-wrapper full-width ${isPaperDropdownOpen ? 'open' : ''}`}>
                              <div 
                                className="custom-dropdown-trigger"
                                onClick={() => setIsPaperDropdownOpen(prev => !prev)}
                              >
                                <span>{selectedPaper.label}</span>
                                {isPaperDropdownOpen ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                              </div>
                              {isPaperDropdownOpen && (
                                <div className="custom-dropdown-menu">
                                  {(product.id === 'dibond' ? MOCK_PAPERS.filter(p => p.id !== 'paper_glossy') : MOCK_PAPERS).map((paper) => (
                                    <div 
                                      key={paper.id} 
                                      className={`custom-dropdown-item ${selectedPaper.id === paper.id ? 'active' : ''}`}
                                      onClick={() => {
                                        setSelectedPaper(paper);
                                        setIsPaperDropdownOpen(false);
                                      }}
                                    >
                                      {paper.label}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      )}

                      {/* Border dropdown — prints and deckled_prints */}
                      {(product.id === 'prints' || product.id === 'deckled_prints') && (
                        <div className="pt-dropdown-input-field IF-2-2" data-component="IF-2-2">
                          <div className="FE-2-2">
                            <div className="FE-2-2__header">
                              <span>Border</span>
                            </div>
                          </div>
                          <div className="pt-dropdown-input">
                            <div className="pt-system-dropdown-wrapper full-width">
                              <select
                                className="pdp-select-input"
                                value={selectedBorder}
                                onChange={(e) => setSelectedBorder(e.target.value)}
                              >
                                <option value="none">No Border</option>
                                <option value="white">White Border</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {hasFrameOptions && (
                        <div className="pt-dropdown-input-field IF-2-2" style={{ marginTop: '20px' }}>
                          <div className="FE-2-2">
                            <div className="FE-2-2__header" style={{ margin: '0 0 12px 0' }}>
                              <span>Color</span>
                            </div>
                          </div>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <div className="frame-color-selector" style={{ 
                              display: 'flex', 
                              gap: '16px', 
                              alignItems: 'flex-start',
                              overflowX: 'auto',
                              paddingBottom: '12px',
                              maxWidth: 'calc(100% - 40px)',
                              scrollbarWidth: 'none',
                              msOverflowStyle: 'none'
                            }}>
                              {MOCK_FRAMES.filter(f => f.id !== 'frame_none').map((frame) => {
                                let renderColor = frame.color;
                                let renderName = frame.label;
                                const isSelected = selectedFrame.id === frame.id;
                                
                                return (
                                  <div 
                                    key={frame.id} 
                                    className="color-swatch-wrapper"
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0, width: '64px', textAlign: 'center' }}
                                    onClick={() => setSelectedFrame(frame)}
                                  >
                                    <div 
                                      className="color-swatch-circle"
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        backgroundColor: renderColor,
                                        border: isSelected ? '2px solid #5a5a5a' : '1px solid #ddd',
                                        padding: '2px',
                                        position: 'relative'
                                      }}
                                    >
                                      <div style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        borderRadius: '50%', 
                                        backgroundColor: renderColor,
                                        backgroundImage: frame.colorThumb ? `url(${frame.colorThumb})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                      }}></div>
                                      {isSelected && (
                                        <div style={{
                                          position: 'absolute',
                                          bottom: '-4px',
                                          right: '-4px',
                                          background: '#a5967f',
                                          color: '#fff',
                                          borderRadius: '50%',
                                          width: '14px',
                                          height: '14px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '10px'
                                        }}>✓</div>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '11px', marginTop: '8px', color: '#333' }}>{renderName}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ marginLeft: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <ChevronRight size={24} strokeWidth={1.5} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Layout selector for matted collages */}
                      {product.id === 'matted_collages' && (
                        <div className="pt-dropdown-input-field IF-2-2" style={{ marginTop: '20px' }}>
                          <div className="FE-2-2">
                            <div className="FE-2-2__header" style={{ margin: '0 0 12px 0' }}>
                              <span>Layout</span>
                            </div>
                          </div>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button className="layout-scroll-btn" style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              border: '1px solid #ddd',
                              background: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#666',
                              flexShrink: 0
                            }}>
                              <ChevronLeft size={16} />
                            </button>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              {LAYOUT_OPTIONS.map((layout) => (
                                <div 
                                  key={layout.id} 
                                  className={`layout-option ${selectedLayout.id === layout.id ? 'active' : ''}`}
                                  style={{
                                    position: 'relative',
                                    width: '70px',
                                    height: '70px',
                                    borderRadius: '4px',
                                    border: selectedLayout.id === layout.id ? '2px solid #a5967f' : '2px solid #ddd',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onClick={() => setSelectedLayout(layout)}
                                >
                                  <img src={layout.thumbnail} alt={layout.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  {selectedLayout.id === layout.id && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '4px',
                                      right: '4px',
                                      width: '24px',
                                      height: '24px',
                                      background: '#a5967f',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff'
                                    }}>
                                      <Check size={14} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}



                      {product.id !== 'matted_frame' && (
                        <div className="pdp-products-form__cta" style={{ marginTop: '24px' }}>
                          <div className="pdp-products-form-cta__price">
                            <div className="SF-1-3">₹{currentPrice.toFixed(2)}</div>
                            <div className="SF-4-2">Tax not included</div>
                          </div>
                        </div>
                      )}

                      <div className="pt-form-conclude FRMC-4-1">
                        <div className="pt-form-alternatives">
                          <button 
                            className="BS-1-1-5 full-width" 
                            data-component="BS-1-1-5" 
                            type="button"
                            onClick={handleStartCustomizing}
                          >
                            <div className="pt-button__content">
                              <div className="pt-button__inner">
                                <span>Select photos</span>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                    </div>
                  </form>
                </div>

                {/* Collapsible Info Accordions */}
                <div className="v-expansion-panels v-theme--light v-expansion-panels--variant-accordion pt-collapsible">
                  
                  {/* Product Info Panel */}
                  <div className="product-info">
                    <div className="v-expansion-panel pt-collapsible-item pdp-collapsible SF-3-4" data-component="PDP-23-1-1">
                      <button 
                        className="v-expansion-panel-title pt-collapsible-item__base CCE-5-1-1" 
                        type="button" 
                        aria-expanded={openAccordions.info}
                        onClick={() => toggleAccordion('info')}
                      >
                        <div className="pt-collapsible-item__header CCE-5-4-1">Product Info</div>
                        <span className="v-expansion-panel-title__icon">
                          <svg viewBox="0 0 12 12" className={`IS-3 pt-collapsible-item__toggle-icon ${openAccordions.info ? 'rotated-180' : ''}`} style={{ width: '12px', height: '12px', transition: 'transform 0.2s', fill: 'currentColor' }}>
                            <path d="M10.527 2.918a.75.75 0 0 1 1.055 1.056l-.052.056-5 5a.75.75 0 0 1-1.004.052L5.47 9.03l-5-5-.052-.056a.75.75 0 0 1 1.056-1.056l.056.052L6 7.44l4.47-4.47.056-.052Z" />
                          </svg>
                        </span>
                      </button>
                      {openAccordions.info && (
                        <div className="v-expansion-panel-text" style={{ padding: '15px' }}>
                          <ul className="pdp-info-bullets-list" style={{ listStyle: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li>Professional museum-grade printing using pigment ink</li>
                            <li>Vibrant color accuracy, deep blacks, and fine contrast details</li>
                            <li>Environmentally friendly backing made from 100% recycled materials</li>
                            <li>Arrives fully compiled with ready-to-hang mounting attachments</li>
                            <li>Premium structural build designed to stand flat against any wall</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Production & Shipping Panel */}
                  <div className="production-and-shipping-container">
                    <div className="v-expansion-panel pt-collapsible-item pdp-collapsible SF-3-4" data-component="PDP-23-1-1">
                      <button 
                        className="v-expansion-panel-title pt-collapsible-item__base CCE-5-1-1" 
                        type="button" 
                        aria-expanded={openAccordions.shipping}
                        onClick={() => toggleAccordion('shipping')}
                      >
                        <div className="pt-collapsible-item__header CCE-5-4-1">Production & shipping</div>
                        <span className="v-expansion-panel-title__icon">
                          <svg viewBox="0 0 12 12" className={`IS-3 pt-collapsible-item__toggle-icon ${openAccordions.shipping ? 'rotated-180' : ''}`} style={{ width: '12px', height: '12px', transition: 'transform 0.2s', fill: 'currentColor' }}>
                            <path d="M10.527 2.918a.75.75 0 0 1 1.055 1.056l-.052.056-5 5a.75.75 0 0 1-1.004.052L5.47 9.03l-5-5-.052-.056a.75.75 0 0 1 1.056-1.056l.056.052L6 7.44l4.47-4.47.056-.052Z" />
                          </svg>
                        </span>
                      </button>
                      {openAccordions.shipping && (
                        <div className="v-expansion-panel-text" style={{ padding: '15px' }}>
                          <div className="pdp-shipping-info-row" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                            <Package size={18} strokeWidth={1.5} className="pdp-shipping-icon" />
                            <div>
                              <strong>Ready to ship in 3-5 business days</strong>
                              <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>Every customized frame is individually checked, assembled, and packed by hand.</p>
                            </div>
                          </div>
                          <div className="pdp-shipping-info-row" style={{ display: 'flex', gap: '12px' }}>
                            <Truck size={18} strokeWidth={1.5} className="pdp-shipping-icon" />
                            <div>
                              <strong>Free shipping on orders above ₹15,000.00</strong>
                              <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}> We deliver using robust protective casing to ensure safe arrival at your home.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
        <div className="pdp-bottom-filler" style={{ height: '100px' }}></div>
      </div>
    </div>
  );
}













































