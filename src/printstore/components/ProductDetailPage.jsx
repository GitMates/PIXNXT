import React, { useState, useRef } from 'react';
import { ChevronLeft, Info, HelpCircle, Shield, Truck, Package } from 'lucide-react';
import { MOCK_SIZES, MOCK_PAPERS, MOCK_FRAMES } from '../data/mockStoreData';

const PRODUCT_DETAILS_MAP = {
  dibond: {
    heroImage: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
    roomBackground: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
    subtitle: "Lightweight & Durable",
    featureTitle: "Contemporary Decor Piece",
    featureDesc: "A contemporary decor piece minimalists will love, Dibond Prints are a lightweight yet durable way to display your photos — featuring a quality print adhered to eco-friendly backing made from recycled materials.",
    details: [
      { name: "Side View", url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Material", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Mounting", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
    ]
  },
  matted_frame: {
    heroImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=1200&h=800",
    roomBackground: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
    subtitle: "Classic & Elegant",
    featureTitle: "Iconic Mat Window Stage",
    featureDesc: "Give your photos center stage with our iconic Matted Frames. Each print is surrounded by a premium acid-free mat board and enclosed in a high-quality wooden frame, ready to hang and stand the test of time.",
    details: [
      { name: "Corner Profile", url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Bevel Cutout", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Backing Close", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
    ]
  },
  gallery_board: {
    heroImage: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1200&h=800",
    roomBackground: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
    subtitle: "Firm & Dynamic Presentation",
    featureTitle: "Premium Mounted Board",
    featureDesc: "Elevate your visual space with lightweight mounted boards. Our prints are laminated and sealed onto a firm foam backing, ensuring a flat, reflection-free, and sleek contemporary look.",
    details: [
      { name: "Side Angle", url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Board Foam", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Mount Hook", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
    ]
  },
  frames: {
    heroImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=1200&h=800",
    roomBackground: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
    subtitle: "Sleek Wood Borders",
    featureTitle: "Traditional Wood Framing",
    featureDesc: "Classic wood frames complementing any quality print of your choice. Clean mitered corners, high-clarity glaze, and standard matte finishes highlight the natural grain of premium ash wood.",
    details: [
      { name: "Frame Side", url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Miter Corner", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Stand Clip", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
    ]
  },
  canvas: {
    heroImage: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1200&h=800",
    roomBackground: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
    subtitle: "Textured & Immersive",
    featureTitle: "Museum Canvas Texture",
    featureDesc: "A wall art classic that displays your photos with a premium textured finish. Crafted on acid-free poly-cotton blend, hand-stretched over custom pine stretcher bars.",
    details: [
      { name: "Canvas Warp", url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Texture Edge", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Wood Joint", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
    ]
  },
  circular_frames: {
    heroImage: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1200&h=800",
    roomBackground: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
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
    heroImage: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1200&h=800",
    roomBackground: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
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
    heroImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=1200&h=800",
    roomBackground: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=800",
    subtitle: "Storyteller Collections",
    featureTitle: "Multi-Memory Matte",
    featureDesc: "An elegant way to celebrate multiple memories together in one frame. Displays up to three photos set inside custom bevel cut openings in a single mat board.",
    details: [
      { name: "Mat Divider", url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Double Mat", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=400" },
      { name: "Oak Border", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=600&h=400" }
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

export default function ProductDetailPage({ product, onBack, onStartCustomizing }) {
  const details = PRODUCT_DETAILS_MAP[product.id] || DEFAULT_FALLBACK_DETAILS;

  // Selection states for styling configuration
  const [selectedSize, setSelectedSize] = useState(MOCK_SIZES[0]);
  const [selectedPaper, setSelectedPaper] = useState(MOCK_PAPERS[0]);
  const [selectedFrame, setSelectedFrame] = useState(MOCK_FRAMES[0]);
  
  // Customizer preview settings
  const [activePreviewType, setActivePreviewType] = useState('room'); // 'room' | 'detail-0' | 'detail-1' | 'detail-2'
  
  // Collapsible accordion states
  const [openAccordions, setOpenAccordions] = useState({ info: true, shipping: false });

  const configuratorRef = useRef(null);

  // Calculate pricing based on selection
  const currentPrice = product.basePrice + selectedSize.priceModifier + selectedPaper.priceModifier + (product.id.includes('frame') || product.id.includes('collage') ? selectedFrame.priceModifier : 0);

  const toggleAccordion = (section) => {
    setOpenAccordions(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleStartCustomizing = () => {
    onStartCustomizing({
      ...product,
      selectedSize,
      selectedPaper,
      selectedFrame
    });
  };

  const getActivePreviewUrl = () => {
    if (activePreviewType === 'room') return details.roomBackground;
    const idx = parseInt(activePreviewType.split('-')[1]);
    return details.details[idx]?.url || details.roomBackground;
  };

  // Determine if frame options apply for this product type
  const hasFrameOptions = product.id.includes('frame') || product.id.includes('collage') || product.id === 'gallery_board' || product.id === 'frames';

  return (
    <div className="pdp-container">
      {/* 1. Header Bar Navigation */}
      <div className="pdp-header">
        <div className="pdp-header-left" onClick={onBack}>
          <ChevronLeft size={20} className="pdp-back-icon" />
          <span className="pdp-product-header-name">{product.name}</span>
        </div>
        <div className="pdp-header-right">
          <span className="pdp-breadcrumb-link" onClick={onBack}>Wall Display</span>
          <span className="pdp-breadcrumb-separator">/</span>
          <span className="pdp-breadcrumb-active">Prints</span>
        </div>
      </div>

      {/* 2. Intro Fold (Split Screen) */}
      <div className="pdp-intro-fold">
        {/* Left Side: Hero Image Mockup */}
        <div className="pdp-intro-left-section">
          <img 
            src={details.heroImage} 
            alt={product.name} 
            className="pdp-intro-hero-img"
          />
        </div>

        {/* Right Side: Product Intro Summary */}
        <div className="pdp-intro-right-section">
          <span className="pdp-intro-subtitle">{details.subtitle}</span>
          <h1 className="pdp-intro-title">{product.name}</h1>
          <p className="pdp-intro-desc">{product.description}</p>
          
          <div className="pdp-intro-meta">
            <span className="pdp-intro-price-label">Starting at</span>
            <span className="pdp-intro-price">₹{product.basePrice.toFixed(2)}</span>
          </div>

          <button 
            className="pdp-intro-customize-btn"
            onClick={() => {
              configuratorRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Start Customizing
          </button>
        </div>
      </div>

      {/* 3. Details Info Fold */}
      <div className="pdp-details-fold">
        <div className="pdp-details-grid">
          <div className="pdp-details-text-box">
            <h2 className="pdp-details-feature-title">{details.featureTitle}</h2>
            <p className="pdp-details-feature-desc">{details.featureDesc}</p>
          </div>
          
          <div className="pdp-details-images-box">
            {details.details.map((item, idx) => (
              <div key={idx} className={`pdp-detail-img-card card-${idx}`}>
                <img src={item.url} alt={item.name} className="pdp-detail-img" />
                <span className="pdp-detail-img-label">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Configurator & Room Preview Fold */}
      <div ref={configuratorRef} className="pdp-configurator-fold">
        <div className="pdp-configurator-grid">
          {/* Left Side: Room Mockup Wall Render */}
          <div className="pdp-configurator-preview-section">
            <div className="pdp-main-preview-viewport">
              {activePreviewType === 'room' ? (
                <div className="pdp-room-render-container">
                  <img 
                    src={details.roomBackground} 
                    alt="Living Room Mockup" 
                    className="pdp-room-bg-img"
                  />
                  {/* Dynamic Floating Frame Canvas Overlay on Sofa Wall */}
                  <div className={`pdp-floating-frame-overlay pdp-overlay-${product.id}`}>
                    <div className="pdp-overlay-matte-board">
                      {product.id === 'matted_collages' ? (
                        <div className="pdp-overlay-collage-wrapper">
                          <img 
                            src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200" 
                            alt="Collage 1" 
                            className="pdp-overlay-collage-img"
                          />
                          <img 
                            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800&h=1200" 
                            alt="Collage 2" 
                            className="pdp-overlay-collage-img"
                          />
                        </div>
                      ) : (
                        <img 
                          src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200" 
                          alt="Customized Print" 
                          className="pdp-overlay-single-img"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <img 
                  src={getActivePreviewUrl()} 
                  alt="Detail Preview" 
                  className="pdp-detail-closeup-img"
                />
              )}
            </div>

            {/* Viewport Toggles (Thumbnails row underneath room mockup) */}
            <div className="pdp-preview-thumbnails-row">
              <button 
                className={`pdp-preview-thumb-btn ${activePreviewType === 'room' ? 'active' : ''}`}
                onClick={() => setActivePreviewType('room')}
              >
                <img src={details.roomBackground} alt="Room" className="pdp-preview-thumb-img" />
                <span className="pdp-preview-thumb-label">Room View</span>
              </button>
              
              {details.details.map((item, idx) => (
                <button 
                  key={idx}
                  className={`pdp-preview-thumb-btn ${activePreviewType === `detail-${idx}` ? 'active' : ''}`}
                  onClick={() => setActivePreviewType(`detail-${idx}`)}
                >
                  <img src={item.url} alt={item.name} className="pdp-preview-thumb-img" />
                  <span className="pdp-preview-thumb-label">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Configuration Options Selector panel */}
          <div className="pdp-configurator-options-section">
            <h2 className="pdp-configurator-title">Style your {product.name}</h2>

            {/* Size Dropdown Select */}
            <div className="pdp-option-group">
              <label className="pdp-option-label">Size</label>
              <div className="pdp-dropdown-wrapper">
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
                      {size.label} {size.priceModifier > 0 ? `(+₹${size.priceModifier.toFixed(2)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Frame Dropdown Select (Conditional) */}
            {hasFrameOptions && (
              <div className="pdp-option-group">
                <label className="pdp-option-label">Frame Option</label>
                <div className="pdp-dropdown-wrapper">
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
                        {frame.label} {frame.priceModifier > 0 ? `(+₹${frame.priceModifier.toFixed(2)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Paper Type Dropdown Select */}
            <div className="pdp-option-group">
              <label className="pdp-option-label">Paper Type</label>
              <div className="pdp-dropdown-wrapper">
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
                      {paper.label} {paper.priceModifier > 0 ? `(+₹${paper.priceModifier.toFixed(2)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="pdp-option-help-text">{selectedPaper.description}</p>
            </div>

            {/* Price & Primary Action Panel */}
            <div className="pdp-purchase-actions-box">
              <div className="pdp-price-summary-row">
                <span className="pdp-calculated-price">₹{currentPrice.toFixed(2)}</span>
                <span className="pdp-tax-disclaimer">Tax not included</span>
              </div>
              
              <button 
                className="pdp-submit-select-photos-btn"
                onClick={handleStartCustomizing}
              >
                Select photos
              </button>
            </div>

            {/* Collapsible Info Accordions */}
            <div className="pdp-accordions-group">
              {/* Accordion 1: Product Info */}
              <div className="pdp-accordion-item">
                <button 
                  className="pdp-accordion-header"
                  onClick={() => toggleAccordion('info')}
                >
                  <span className="pdp-accordion-header-title">Product Info</span>
                  <span className="pdp-accordion-icon">{openAccordions.info ? '−' : '+'}</span>
                </button>
                {openAccordions.info && (
                  <div className="pdp-accordion-body">
                    <ul className="pdp-info-bullets-list">
                      <li>Professional museum-grade printing using pigment ink</li>
                      <li>Vibrant color accuracy, deep blacks, and fine contrast details</li>
                      <li>Environmentally friendly backing made from 100% recycled materials</li>
                      <li>Arrives fully compiled with ready-to-hang mounting attachments</li>
                      <li>Premium structural build designed to stand flat against any wall</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion 2: Production & Shipping */}
              <div className="pdp-accordion-item">
                <button 
                  className="pdp-accordion-header"
                  onClick={() => toggleAccordion('shipping')}
                >
                  <span className="pdp-accordion-header-title">Production & shipping</span>
                  <span className="pdp-accordion-icon">{openAccordions.shipping ? '−' : '+'}</span>
                </button>
                {openAccordions.shipping && (
                  <div className="pdp-accordion-body">
                    <div className="pdp-shipping-info-row">
                      <Package size={18} strokeWidth={1.5} className="pdp-shipping-icon" />
                      <div>
                        <strong>Ready to ship in 3-5 business days</strong>
                        <p>Every customized frame is individually checked, assembled, and packed by hand.</p>
                      </div>
                    </div>
                    <div className="pdp-shipping-info-row">
                      <Truck size={18} strokeWidth={1.5} className="pdp-shipping-icon" />
                      <div>
                        <strong>Free shipping on orders above ₹2,000.00</strong>
                        <p>We deliver using robust protective casing to ensure safe arrival at your home.</p>
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
  );
}
