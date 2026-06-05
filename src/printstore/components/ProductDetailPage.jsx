import React, { useState, useRef } from 'react';
import { ChevronLeft, Info, HelpCircle, Shield, Truck, Package } from 'lucide-react';
import { MOCK_SIZES, MOCK_PAPERS, MOCK_FRAMES } from '../data/mockStoreData';

import circularRoom from '../circular frames_files/0.webp';
import floatRoom from '../float frames_files/1.webp';
import collageRoom from '../Matted Frame Collages_files/0.webp';
import kRoom from '../k_files/1.webp';

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
  gallery_board: {
    heroImage: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1200&h=800",
    roomBackground: "https://pictime6eus1public-pub-f5djhafrcqd3djf7.a02.azurefd.net/pictures/51/748/51748702/homepage/homepage.jpg?rs=134218589898130144",
    subtitle: "Firm & Dynamic Presentation",
    featureTitle: "Premium Mounted Board",
    featureDesc: "Elevate your visual space with lightweight mounted boards. Our prints are laminated and sealed onto a firm foam backing, ensuring a flat, reflection-free, and sleek contemporary look.",
    details: [
      { name: "Front Angle", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/galleryboards_std/lowres/bayphoto-gallery-board00001.webp" },
      { name: "Side Angle", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/galleryboards_std/lowres/bay-photo-gallery-board00003.webp" },
      { name: "Board Foam", url: "https://pictimecloudaf-pub-g3csanfebyefg3dm.a02.azurefd.net/pictures/scripts/platform2/resources/stores/4/shop/data-structures/fulfillers/0/specs/galleryboards_std/lowres/bay-photo-gallery-board00004.webp" }
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
    heroImage: circularRoom,
    roomBackground: circularRoom,
    subtitle: "Modern Round Geometry",
    featureTitle: "Handtorn Round Framing",
    featureDesc: "Make a statement with a circular frame. A handtorn print is delicately centered inside a round wooden frame, drawing focus and giving your portraits an artistic, museum-grade look.",
    details: [
      { name: "Round Frame", url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Deckled Circle", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Profile View", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
    ]
  },
  float_frames: {
    heroImage: floatRoom,
    roomBackground: floatRoom,
    subtitle: "Dimensional & Deep",
    featureTitle: "Elevated Floating Deckle",
    featureDesc: "A floating hand-torn print elevated in a wooden frame. Shadows cast under the hand-torn edge add striking depth, showcasing the organic texture of 100% cotton rag paper.",
    details: [
      { name: "Wood Bevel", url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Float Depth", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Torn Border", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
    ]
  },
  matted_collages: {
    heroImage: collageRoom,
    roomBackground: collageRoom,
    subtitle: "Storyteller Collections",
    featureTitle: "Multi-Memory Matte",
    featureDesc: "An elegant way to celebrate multiple memories together in one frame. Displays up to three photos set inside custom bevel cut openings in a single mat board.",
    details: [
      { name: "Mat Divider", url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Double Mat", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Oak Border", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
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
  }
};

// Fallback details for basic prints / other non-frame items
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

  // Selection states for styling configuration
  const [selectedSize, setSelectedSize] = useState(MOCK_SIZES[0]);
  const [selectedPaper, setSelectedPaper] = useState(MOCK_PAPERS[0]);
  const [selectedFrame, setSelectedFrame] = useState(MOCK_FRAMES[0]);
  
  // Customizer preview settings
  const [activePreviewType, setActivePreviewType] = useState('room'); // 'room' | 'detail-0' | 'detail-1' | 'detail-2'
  const [activePreviewTab, setActivePreviewTab] = useState('wall'); // 'wall' | 'prints'
  
  // Collapsible accordion states
  const [openAccordions, setOpenAccordions] = useState({ info: true, shipping: false });
  const [activeTrioIndex, setActiveTrioIndex] = useState(0);

  const configuratorRef = useRef(null);
  const mediaRef = useRef(null);

  // Calculate pricing based on selection
  const currentPrice = product.basePrice + selectedSize.priceModifier + selectedPaper.priceModifier + (product.id.includes('frame') || product.id.includes('collage') ? selectedFrame.priceModifier : 0);

  const toggleAccordion = (section) => {
    // Snapshot the left image position before DOM update
    const mediaEl = mediaRef.current;
    const prevTop = mediaEl ? mediaEl.getBoundingClientRect().top : null;
    
    setOpenAccordions(prev => ({ ...prev, [section]: !prev[section] }));
    
    // After React re-renders, restore scroll so the left image stays in place
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
    // Instead of customizing a single mock photo right away,
    // tell the app which product we want, so the user can select photos.
    onSelectPhotosForProduct(product);
  };

  const getActivePreviewUrl = () => {
    if (activePreviewType === 'room') return details.roomBackground;
    const idx = parseInt(activePreviewType.split('-')[1]);
    return details.details[idx]?.url || details.roomBackground;
  };

  // Determine if frame options apply  // Whether this product has a framing/color option
  const hasFrameOptions = product.id.includes('frame') || product.id.includes('collage') || product.id === 'frames';

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
        <div className="pdp-intro-container">
          <div className="pdp-intro">
            <div className="pdp-intro__left-section" style={{ backgroundImage: `url(${details.heroImage})` }}>
            </div>
            <div className="pdp-intro__right-section PDP-3-1-1">
              <div className="SF-1-1">{product.name}</div>
              <div className="SF-2-1">{product.description}</div>
              <div className="SF-2-1">Starting at ${product.basePrice.toFixed(2)}</div>
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

        {/* 3. Closeup / Details Fold */}
        <div className="pdp-closeup PDP-5-1-1">
          <div className="pdp-closeup__inner">
            {/* Left col: text */}
            <div className="pdp-products-closeup">
              <div className="pdp-product-description PDP-3-1-1">
                <div className="SF-1-2">{details.subtitle || details.featureTitle}</div>
                <div className="SF-4-1">{details.featureDesc}</div>
              </div>
            </div>

            {/* Right col: interactive trio images */}
            <div className="pdp-closeup__animation">
              <div className="pt-trio-scope" data-component="PDP-5-1-1">
                <div className="pt-trio-scope__container">
                  {details.details.slice(0, 3).map((item, idx) => {
                    // Determine role: the active index is 'big', next is 'small', next is 'tiny'
                    const order = [(activeTrioIndex) % 3, (activeTrioIndex + 1) % 3, (activeTrioIndex + 2) % 3];
                    let role = 'tiny';
                    if (idx === order[0]) role = 'big';
                    else if (idx === order[1]) role = 'small';
                    
                    return (
                      <div 
                        key={idx} 
                        className={`pt-trio-scope__container__image trio-role-${role}`}
                        data-role={role}
                        style={{ backgroundImage: `url(${item.url})` }}
                        onMouseEnter={() => {
                          if (role !== 'big') setActiveTrioIndex(idx);
                        }}
                      >
                        <div className="pt-trio-scope__image-label">{item.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Configurator & Room Preview Fold */}
        <div ref={configuratorRef} className="pdp-preview-container" style={{ position: 'relative' }}>
          <div className="pdp-preview">
            
            {/* Left Column: Media Set View (Room Preview & Swiper) */}
            <div ref={mediaRef} className="pdp-preview__media-set-view">
              <div className="media-set C-4-40-1-1">
                <div className="media-set__preview" style={{ position: 'relative' }}>
                  {activePreviewType === 'room' ? (
                    <div 
                      className="media-set-preview" 
                      style={{ backgroundImage: `url(${details.roomBackground})` }}
                    >
                      <div className="media-set-preview__composition-container" style={{ 
                        left: product.id === 'matted_frame' ? '15.15%' : product.id === 'gallery_board' ? '69.5443%' : '14.0089%', 
                        top: product.id === 'matted_frame' ? '12.05%' : product.id === 'gallery_board' ? '20.5828%' : '15.2589%', 
                        width: product.id === 'matted_frame' ? '16.31%' : product.id === 'gallery_board' ? '11.6514%' : '18.6422%', 
                        height: product.id === 'matted_frame' ? '34.57%' : product.id === 'gallery_board' ? '24.6944%' : '28.2222%' 
                      }}>
                        <div className="composition-preview">
                          <div className="composition-preview__composition" style={{ aspectRatio: product.id === 'matted_frame' ? '0.783494 / 1' : product.id === 'gallery_board' ? '0.714286 / 1' : '1 / 1', width: '100%' }}>
                            <div className="composition-preview__printable-area" style={{ 
                              position: 'absolute',
                              ...(product.id === 'gallery_board' 
                                  ? { width: '78.33%', height: '84.14%', top: '7.92%', left: '10.83%' }
                                  : product.id === 'matted_frame' || product.id === 'frames'
                                  ? { width: '69.7802%', height: '76.3746%', top: '11.8127%', left: '15.1099%' }
                                  : { width: '100%', height: '100%', top: '0%', left: '0%' })
                            }}>
                              <div className="composition-preview-box" style={{ 
                                position: 'absolute',
                                ...(product.id === 'gallery_board'
                                    ? { width: '100%', height: '100%', top: '0%', left: '0%' }
                                    : product.id === 'matted_frame' || product.id === 'frames'
                                    ? { width: '64%', height: '68.5714%', top: '15.8095%', left: '18%' }
                                    : { width: '100%', height: '100%', top: '0%', left: '0%' })
                              }}>
                                {product.id === 'matted_collages' ? (
                                  <div className="pdp-overlay-collage-wrapper">
                                    <div className="composition-preview-box__image" style={{ backgroundImage: `url("https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200")`, width: '100%', height: '50%' }}></div>
                                    <div className="composition-preview-box__image" style={{ backgroundImage: `url("https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800&h=1200")`, width: '100%', height: '50%' }}></div>
                                  </div>
                                ) : (
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
                                      backgroundPosition: 'center'
                                    }}
                                  ></div>
                                )}
                              </div>
                            </div>
                            
                            {/* Overlay types (shadows and frames) */}
                            {product.id === 'dibond' ? (
                              <div className="dibond-print-pdp-overlay composition-preview__overlay" style={{ aspectRatio: '1 / 1', width: '100%' }}>
                                <div style={{ position: 'absolute', width: '100%', height: '100%', top: '0%', left: '0%' }}>
                                  <div className="dibond-print-shadow"></div>
                                </div>
                              </div>
                            ) : product.id === 'matted_frame' || product.id === 'frames' ? (
                              <div className="matted-frame-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
                                <div className="matted-frame-shadow" style={{ 
                                  position: 'absolute', 
                                  width: '100%', 
                                  height: '100%', 
                                  backgroundColor: selectedFrame?.color || '#111111',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <div className="matted-frame-mat" style={{
                                    width: '84%',
                                    height: '87%',
                                    backgroundColor: '#fff'
                                  }}>
                                  </div>
                                </div>
                              </div>
                            ) : product.id === 'gallery_board' ? (
                              <div className="gallery-board-pdp-overlay composition-preview__overlay" style={{
                                width: '100%',
                                height: '100%',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: 1,
                                backgroundColor: '#fff',
                                boxShadow: 'rgba(0, 0, 0, 0) 33px 33px 13px 0px, rgba(0, 0, 0, 0.01) 21px 21px 12px 0px, rgba(0, 0, 0, 0.05) 12px 12px 10px 0px, rgba(0, 0, 0, 0.09) 5px 5px 7px 0px, rgba(0, 0, 0, 0.1) 1px 1px 4px 0px'
                              }}>
                              </div>
                            ) : (
                              /* For other products, render their respective overlays classes */
                              <div 
                                className={`pdp-floating-frame-overlay pdp-overlay-${product.id} composition-preview__overlay`} 
                                style={{ 
                                  width: '100%', 
                                  height: '100%',
                                  ...(hasFrameOptions && selectedFrame?.color && { '--frame-color': selectedFrame.color })
                                }}
                              >
                                <div className="pdp-overlay-matte-board">
                                  {/* Empty board or overlay styling via CSS box-shadow / borders */}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
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
                          setActivePreviewType(`detail-${details.details.length - 1}`);
                          setActivePreviewTab('prints');
                        } else {
                          const idx = parseInt(activePreviewType.split('-')[1]);
                          if (idx === 0) {
                            setActivePreviewType('room');
                            setActivePreviewTab('wall');
                          } else {
                            setActivePreviewType(`detail-${idx - 1}`);
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
                      <div 
                        className={`media-set-image BS-22-1-1 ${activePreviewType === 'room' ? 'media-set-image--selected' : ''}`}
                        onClick={() => {
                          setActivePreviewType('room');
                          setActivePreviewTab('wall');
                        }}
                        style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                      >
                        <div className="media-set-preview-thumb-bg" style={{ backgroundImage: `url(${details.roomBackground})`, width: '100%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                        <div className="media-set-preview__composition-container" style={{ 
                          left: product.id === 'matted_frame' ? '15.15%' : product.id === 'gallery_board' ? '69.5443%' : '14.0089%', 
                          top: product.id === 'matted_frame' ? '12.05%' : product.id === 'gallery_board' ? '20.5828%' : '15.2589%', 
                          width: product.id === 'matted_frame' ? '16.31%' : product.id === 'gallery_board' ? '11.6514%' : '18.6422%', 
                          height: product.id === 'matted_frame' ? '34.57%' : product.id === 'gallery_board' ? '24.6944%' : '28.2222%', 
                          position: 'absolute' 
                        }}>
                          <div className="composition-preview" style={{ width: '100%', height: '100%' }}>
                            <div className="composition-preview__composition" style={{ aspectRatio: product.id === 'matted_frame' ? '0.783494 / 1' : product.id === 'gallery_board' ? '0.714286 / 1' : '1 / 1', width: '100%', height: '100%', position: 'relative' }}>
                              <div className="composition-preview__printable-area" style={{ 
                                width: product.id === 'matted_frame' ? '69.7802%' : '100%', 
                                height: product.id === 'matted_frame' ? '76.3746%' : '100%', 
                                top: product.id === 'matted_frame' ? '11.8127%' : '0%', 
                                left: product.id === 'matted_frame' ? '15.1099%' : '0%',
                                zIndex: 2,
                                position: 'absolute'
                              }}>
                                <div className="composition-preview-box" style={{ 
                                  width: product.id === 'gallery_board' ? '78.3333%' : '100%', 
                                  height: product.id === 'gallery_board' ? '84.1429%' : '100%', 
                                  top: product.id === 'gallery_board' ? '7.90476%' : '0%', 
                                  left: product.id === 'gallery_board' ? '10.8%' : '0%',
                                  position: 'absolute' 
                                }}>
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
                                      backgroundPosition: 'center'
                                    }}
                                  ></div>
                                </div>
                              </div>
                              {/* Overlay types (shadows and frames) */}
                              {product.id === 'dibond' ? (
                                <div className="dibond-print-pdp-overlay composition-preview__overlay" style={{ aspectRatio: '1 / 1', width: '100%' }}>
                                  <div style={{ position: 'absolute', width: '100%', height: '100%', top: '0%', left: '0%' }}>
                                    <div className="dibond-print-shadow"></div>
                                  </div>
                                </div>
                              ) : product.id === 'matted_frame' || product.id === 'frames' ? (
                                <div className="matted-frame-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
                                  <div className="matted-frame-shadow" style={{ 
                                    position: 'absolute', 
                                    width: '100%', 
                                    height: '100%', 
                                    backgroundColor: selectedFrame?.color || '#111111',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <div className="matted-frame-mat" style={{
                                      width: '84%',
                                      height: '87%',
                                      backgroundColor: '#fff'
                                    }}>
                                    </div>
                                  </div>
                                </div>
                              ) : product.id === 'gallery_board' ? (
                                <div className="gallery-board-pdp-overlay composition-preview__overlay" style={{
                                  width: '100%',
                                  height: '100%',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  zIndex: 1,
                                  backgroundColor: '#fff',
                                  boxShadow: 'rgba(0, 0, 0, 0) 33px 33px 13px 0px, rgba(0, 0, 0, 0.01) 21px 21px 12px 0px, rgba(0, 0, 0, 0.05) 12px 12px 10px 0px, rgba(0, 0, 0, 0.09) 5px 5px 7px 0px, rgba(0, 0, 0, 0.1) 1px 1px 4px 0px'
                                }}>
                                </div>
                              ) : product.id === 'canvas' ? (
                                <div className="canvas-pdp-overlay composition-preview__overlay" style={{
                                  width: '100%',
                                  height: '100%',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  zIndex: 1,
                                  boxShadow: 'rgba(0, 0, 0, 0.1) 0px 15px 16px 3px, rgba(0, 0, 0, 0.06) 0px 0px 7px 3px, rgba(0, 0, 0, 0.25) -1px -1px 3px 0px inset, rgba(0, 0, 0, 0.1) 1px 1px 1px 0px inset, rgba(255, 255, 255, 0.25) 3.5px 3.5px 1px 0px inset',
                                  overflow: 'hidden',
                                  borderRadius: '0.13px'
                                }}>
                                </div>
                              ) : (
                                <div 
                                  className={`pdp-floating-frame-overlay pdp-overlay-${product.id} composition-preview__overlay`} 
                                  style={{ 
                                    width: '100%', 
                                    height: '100%',
                                    ...(hasFrameOptions && selectedFrame?.color && { '--frame-color': selectedFrame.color })
                                  }}
                                >
                                  <div className="pdp-overlay-matte-board"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {details.details.map((item, idx) => (
                        <div 
                          key={idx}
                          className={`media-set-image BS-22-1-1 ${activePreviewType === `detail-${idx}` ? 'media-set-image--selected' : ''}`}
                          onClick={() => {
                            setActivePreviewType(`detail-${idx}`);
                            setActivePreviewTab('prints');
                          }}
                          style={{ 
                            backgroundImage: `url(${item.url})`, 
                            cursor: 'pointer', 
                            backgroundSize: 'cover', 
                            backgroundPosition: 'center'
                          }}
                        >
                        </div>
                      ))}
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
                          if (idx === details.details.length - 1) {
                            setActivePreviewType('room');
                            setActivePreviewTab('wall');
                          } else {
                            setActivePreviewType(`detail-${idx + 1}`);
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
                      
                      {/* Size Select Field */}
                      <div className="pt-dropdown-input-field IF-2-2" data-component="IF-2-2">
                        <div className="FE-2-2">
                          <div className="FE-2-2__header">
                            <span>Size</span>
                          </div>
                        </div>
                        <div className="pt-dropdown-input">
                          <div className="pt-system-dropdown-wrapper full-width">
                            <select 
                              className="pdp-select-input"
                              value={selectedSize.id}
                              onChange={(e) => {
                                const size = MOCK_SIZES.find(s => s.id === e.target.value);
                                if (size) setSelectedSize(size);
                              }}
                            >
                              {MOCK_SIZES.map((size) => (
                                <option key={size.id} value={size.id}>
                                  {size.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Frame option select if applicable */}
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

                      {/* Paper Type Select Field (or Print Size for Matted Frames and Gallery Boards) */}
                      <div className="pt-dropdown-input-field IF-2-2" data-component="IF-2-2">
                        <div className="FE-2-2">
                          <div className="FE-2-2__header">
                            <span>{['matted_frame', 'gallery_board'].includes(product.id) ? 'Print Size' : 'Paper Type'}</span>
                          </div>
                        </div>
                        <div className="pt-dropdown-input">
                          <div className="pt-system-dropdown-wrapper full-width">
                            {['matted_frame', 'gallery_board'].includes(product.id) ? (
                              <select className="pdp-select-input" defaultValue={product.id === 'gallery_board' ? "10x15cm" : "8x8cm"}>
                                {product.id === 'matted_frame' && <option value="8x8cm">8x8cm</option>}
                                <option value="10x10cm">10x10cm</option>
                                {product.id === 'gallery_board' && <option value="10x15cm">10x15cm</option>}
                              </select>
                            ) : (
                              <select 
                                className="pdp-select-input"
                                value={selectedPaper.id}
                                onChange={(e) => {
                                  const paper = MOCK_PAPERS.find(p => p.id === e.target.value);
                                  if (paper) setSelectedPaper(paper);
                                }}
                              >
                                {MOCK_PAPERS.map((paper) => (
                                  <option key={paper.id} value={paper.id}>
                                    {paper.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Frames Color Selector */}
                      {hasFrameOptions && (
                        <div className="pt-dropdown-input-field IF-2-2" style={{ marginTop: '20px' }}>
                          <div className="FE-2-2">
                            <div className="FE-2-2__header" style={{ marginBottom: '12px' }}>
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
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                          </div>
                        </div>
                        </div>
                      )}

                      {/* Price display container box */}
                      {product.id !== 'matted_frame' && (
                        <div className="pdp-products-form__cta">
                          <div className="pdp-products-form-cta__price">
                            <div className="SF-1-3">${currentPrice.toFixed(2)}</div>
                            <div className="SF-4-2">Tax not included</div>
                          </div>
                        </div>
                      )}

                      {/* CTA Action button outside the box */}
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
                        <div className="v-expansion-panel-text" style={{ display: 'block', padding: '15px' }}>
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
                              <strong>Free shipping on orders above $200.00</strong>
                              <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>We deliver using robust protective casing to ensure safe arrival at your home.</p>
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
