import React from 'react';

export default function MattedFramePreview({ 
  product, 
  selectedFrame, 
  selectedSize, 
  selectedPrintSize, 
  customBorderWidthCm, 
  photoUrl: propPhotoUrl,
  isRoomPreview,
  sizeScaleFactor
}) {
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

  const defaultFrameDims = parseDims(selectedSize?.label || '20x30cm', false);
  const printDims = parseDims(selectedPrintSize || '15x15cm', true, selectedSize?.label);

  const woodBorder = 1.5;

  const frameDims = {
    w: defaultFrameDims.w,
    h: defaultFrameDims.h
  };

  // Calculate maximum allowed mat width/height to keep print >= 5cm
  const maxMatW = Math.max(0, (frameDims.w - 5) / 2 - woodBorder);
  const maxMatH = Math.max(0, (frameDims.h - 5) / 2 - woodBorder);

  // matW is the white mat thickness on each side
  const matW = customBorderWidthCm > 0
    ? Math.min(customBorderWidthCm, maxMatW)
    : (product.id === 'frames' ? 0 : Math.max(0, (frameDims.w - printDims.w) / 2 - woodBorder));
  const matH = customBorderWidthCm > 0
    ? Math.min(customBorderWidthCm, maxMatH)
    : (product.id === 'frames' ? 0 : Math.max(0, (frameDims.h - printDims.h) / 2 - woodBorder));

  // Border (total border width on each side including the wood frame)
  const borderW = matW + woodBorder;
  const borderH = matH + woodBorder;

  const printW = customBorderWidthCm > 0
    ? frameDims.w - 2 * borderW
    : (product.id === 'frames' ? frameDims.w - 2 * woodBorder : printDims.w);

  const printH = customBorderWidthCm > 0
    ? frameDims.h - 2 * borderH
    : (product.id === 'frames' ? frameDims.h - 2 * woodBorder : printDims.h);

  const frameAspect = frameDims.w / frameDims.h;

  // Mat container dimensions (area inside the wood border)
  const matContainerW = Math.max(0, frameDims.w - woodBorder * 2);
  const matContainerH = Math.max(0, frameDims.h - woodBorder * 2);
  
  // Mat percentages relative to the dynamic frameDims
  const matPctW = (matContainerW / frameDims.w) * 100;
  const matPctH = (matContainerH / frameDims.h) * 100;

  // Print dimensions relative to the frameDims
  const printPctW = (printW / frameDims.w) * 100;
  const printPctH = (printH / frameDims.h) * 100;
  const printTop = (borderH / frameDims.h) * 100;
  const printLeft = (borderW / frameDims.w) * 100;

  // Determine scale factor for the container width relative to the default frame dimensions,
  // so the image size remains physically constant.
  const containerWidthPct = (frameDims.w / defaultFrameDims.w) * 100;

  // Render measurement scales overlay
  const renderScales = () => {
    if (!isRoomPreview) return null;

    const sf = sizeScaleFactor || 1;

    const lineStyle = {
      position: 'absolute',
      borderStyle: 'solid',
      borderColor: '#555',
      pointerEvents: 'none',
      zIndex: 10
    };

    const labelStyle = {
      position: 'absolute',
      background: 'transparent',
      fontSize: '11px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
      letterSpacing: '0.5px',
      color: '#555',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 12,
      textTransform: 'uppercase'
    };

    const tickStyle = {
      position: 'absolute',
      background: '#555',
      pointerEvents: 'none',
      zIndex: 11
    };

    const lineWidth = Math.max(1, 1.5 / sf);
    const tickLength = Math.max(6, 9 / sf);
    const gap = 26 / sf;
    const textGap = 20 / sf;

    const inConv = (cm) => (cm / 2.54).toFixed(1);
    
    const topLabel = `Image: ${printW} CM / ${inConv(printW)} IN`;
    const leftLabel = `Image: ${printH} CM / ${inConv(printH)} IN`;
    
    // Bottom label: show frame width + custom border width if custom border is active
    const bottomLabel = customBorderWidthCm > 0
      ? `Frame: ${frameDims.w} CM | Border: ${matW} CM`
      : `Frame: ${frameDims.w} CM / ${inConv(frameDims.w)} IN`;
      
    // Right label: show frame height only (no border text)
    const rightLabel = `Frame: ${frameDims.h} CM / ${inConv(frameDims.h)} IN`;

    return (
      <div className="measurement-scales-overlay" style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 999
      }}>
        {/* TOP: Print/Image Width */}
        <div style={{
          position: 'absolute',
          top: `-${gap}px`,
          left: `${printLeft}%`,
          width: `${printPctW}%`,
          height: 0,
          pointerEvents: 'none',
          overflow: 'visible'
        }}>
          <div style={{ ...lineStyle, left: 0, right: 0, top: 0, borderTopWidth: `${lineWidth}px` }}></div>
          <div style={{ ...tickStyle, left: 0, top: `-${tickLength/2}px`, width: `${lineWidth}px`, height: `${tickLength}px` }}></div>
          <div style={{ ...tickStyle, right: 0, top: `-${tickLength/2}px`, width: `${lineWidth}px`, height: `${tickLength}px` }}></div>
          
          <div style={{ ...labelStyle, left: '50%', top: 0, transform: `translate(-50%, -50%) translateY(-${textGap}px) scale(${1 / sf})`, transformOrigin: 'center center' }}>
            {topLabel}
          </div>
        </div>

        {/* LEFT: Print/Image Height */}
        <div style={{
          position: 'absolute',
          left: `-${gap}px`,
          top: `${printTop}%`,
          height: `${printPctH}%`,
          width: 0,
          pointerEvents: 'none',
          overflow: 'visible'
        }}>
          <div style={{ ...lineStyle, top: 0, bottom: 0, left: 0, borderLeftWidth: `${lineWidth}px` }}></div>
          <div style={{ ...tickStyle, top: 0, left: `-${tickLength/2}px`, height: `${lineWidth}px`, width: `${tickLength}px` }}></div>
          <div style={{ ...tickStyle, bottom: 0, left: `-${tickLength/2}px`, height: `${lineWidth}px`, width: `${tickLength}px` }}></div>
          
          <div style={{ ...labelStyle, left: 0, top: '50%', transform: `translate(-50%, -50%) translateX(-${textGap}px) rotate(-90deg) scale(${1 / sf})`, transformOrigin: 'center center' }}>
            {leftLabel}
          </div>
        </div>

        {/* BOTTOM: Frame Width + Border */}
        <div style={{
          position: 'absolute',
          bottom: `-${gap}px`,
          left: 0,
          width: '100%',
          height: 0,
          pointerEvents: 'none',
          overflow: 'visible'
        }}>
          <div style={{ ...lineStyle, left: 0, right: 0, top: 0, borderTopWidth: `${lineWidth}px` }}></div>
          <div style={{ ...tickStyle, left: 0, top: `-${tickLength/2}px`, width: `${lineWidth}px`, height: `${tickLength}px` }}></div>
          <div style={{ ...tickStyle, right: 0, top: `-${tickLength/2}px`, width: `${lineWidth}px`, height: `${tickLength}px` }}></div>
          
          <div style={{ ...labelStyle, left: '50%', top: 0, transform: `translate(-50%, -50%) translateY(${textGap}px) scale(${1 / sf})`, transformOrigin: 'center center' }}>
            {bottomLabel}
          </div>
        </div>

        {/* RIGHT: Frame Height */}
        <div style={{
          position: 'absolute',
          right: `-${gap}px`,
          top: 0,
          height: '100%',
          width: 0,
          pointerEvents: 'none',
          overflow: 'visible'
        }}>
          <div style={{ ...lineStyle, top: 0, bottom: 0, left: 0, borderLeftWidth: `${lineWidth}px` }}></div>
          <div style={{ ...tickStyle, top: 0, left: `-${tickLength/2}px`, height: `${lineWidth}px`, width: `${tickLength}px` }}></div>
          <div style={{ ...tickStyle, bottom: 0, left: `-${tickLength/2}px`, height: `${lineWidth}px`, width: `${tickLength}px` }}></div>
          
          <div style={{ ...labelStyle, left: 0, top: '50%', transform: `translate(-50%, -50%) translateX(${textGap}px) rotate(90deg) scale(${1 / sf})`, transformOrigin: 'center center' }}>
            {rightLabel}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="composition-preview" style={{ width: '100%', height: 'auto', position: 'relative' }}>
      <div className="composition-preview__composition" style={{ 
        aspectRatio: `${frameAspect} / 1`, 
        width: `${containerWidthPct}%`, 
        margin: '0 auto',
        height: 'auto', 
        position: 'relative',
        transition: 'aspect-ratio 0.3s ease-in-out, width 0.3s ease-in-out'
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
          <div className="matted-frame-shadow" style={{ 
            position: 'absolute', 
            width: '100%', 
            height: '100%', 
            backgroundColor: selectedFrame?.color || '#111111', 
            backgroundImage: selectedFrame?.colorThumb ? `url(${selectedFrame.colorThumb})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <div className="matted-frame-mat" style={{ 
                width: `${matPctW}%`, 
                height: `${matPctH}%`, 
                backgroundColor: '#fff',
                boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.1)'
            }}></div>
          </div>
        </div>

        {/* Scales rendered relative to the composition container */}
        {renderScales()}
      </div>
    </div>
  );
}
