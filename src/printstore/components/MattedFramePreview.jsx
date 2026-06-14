import React from 'react';

export default function MattedFramePreview({ product, selectedFrame, selectedSize, selectedPrintSize, photoUrl: propPhotoUrl }) {
  const imageUrl = propPhotoUrl || product.image;
  // Parse dimensions from labels like "13x18cm" or "8x8cm"
  const parseDims = (label, isPrint = false, frameLabel = null) => {
    if (!label) return { w: 20, h: 30 };
    const match = label.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (!match) return { w: 20, h: 30 };
    let w = parseFloat(match[1]);
    let h = parseFloat(match[2]);

    // Apply specific overrides to match the visual designs in the mockups
    if (!isPrint) {
      if (label === '30x45cm') { w = 45; h = 30; }
      else if (label === '50x60cm') { w = 60; h = 50; }
      else if (label === '55x76cm') { w = 76; h = 55; }
    } else {
      if (label === '15x23cm' && (frameLabel === '30x45cm' || frameLabel === '35x35cm')) { w = 23; h = 15; }
      else if (label === '20x30cm' && (frameLabel === '50x50cm' || frameLabel === '50x60cm' || frameLabel === '55x76cm')) { w = 30; h = 20; }
      else if (label === '30x40cm' && frameLabel === '61x61cm') { w = 40; h = 30; }
      else if (label === '51x76cm' && frameLabel === '102x102cm') { w = 76; h = 51; }
    }
    
    return { w, h };
  };

  const frameDims = parseDims(selectedSize?.label || '20x30cm', false);
  const printDims = parseDims(selectedPrintSize || '15x15cm', true, selectedSize?.label);

  const frameAspect = frameDims.w / frameDims.h;

  // Assuming a constant wood border width of 1.5cm all around
  const woodBorder = 1.5;
  const matW = Math.max(0, frameDims.w - woodBorder * 2);
  const matH = Math.max(0, frameDims.h - woodBorder * 2);
  
  // Mat percentages relative to full frame
  const matPctW = (matW / frameDims.w) * 100;
  const matPctH = (matH / frameDims.h) * 100;

  // The print size is placed within the mat window
  // But wait! The `composition-preview__printable-area` in the original code seems to be the image box.
  // Actually, the print is centered in the frame.
  // Print dimensions relative to the full frame:
  const printPctW = (printDims.w / frameDims.w) * 100;
  const printPctH = (printDims.h / frameDims.h) * 100;
  const printTop = ((frameDims.h - printDims.h) / 2 / frameDims.h) * 100;
  const printLeft = ((frameDims.w - printDims.w) / 2 / frameDims.w) * 100;

  return (
    <div className="composition-preview" style={{ width: '100%', height: 'auto', position: 'relative' }}>
      <div className="composition-preview__composition" style={{ 
        aspectRatio: `${frameAspect} / 1`, 
        width: '100%', 
        height: 'auto', 
        position: 'relative',
        transition: 'aspect-ratio 0.3s ease-in-out'
      }}>
        <div className="composition-preview__printable-area" style={{ 
          position: 'absolute',
          width: `${printPctW}%`, 
          height: `${printPctH}%`, 
          top: `${printTop}%`, 
          left: `${printLeft}%`,
          zIndex: 2
        }}>
          <div className="composition-preview-box" style={{ 
            position: 'absolute',
            width: '100%', height: '100%', top: '0', left: '0'
          }}>
            <div 
              className="composition-preview-box__image" 
              style={{ 
                position: 'absolute', 
                backgroundImage: `url(${imageUrl})`, 
                width: '100%', 
                height: '100%', 
                left: '0px', 
                top: '0px',
                backgroundSize: 'cover',
                backgroundPosition: 'center center'
              }}
            ></div>
          </div>
        </div>

        <div className="matted-frame-pdp-overlay composition-preview__overlay" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
          <div className="matted-frame-shadow" style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: selectedFrame?.color || '#111111', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="matted-frame-mat" style={{ 
                width: `${matPctW}%`, 
                height: `${matPctH}%`, 
                backgroundColor: '#fff',
                boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.1)'
            }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
