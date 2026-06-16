import React from 'react';
import { ImageIcon } from 'lucide-react';
import { isSlotLandscape, adjustPhotoUrl } from '../data/mockStoreData';

export default function CartItemPreview({ item }) {
  const product = { id: item.productId }; // We mainly need product.id
  const selectedSize = item.size || {};
  const initialCustomBorderWidthCm = item.customBorderWidthCm || 0;
  const selectedBorder = item.border || 'none';

  const pmatch = selectedSize?.printSize ? selectedSize.printSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/) : null;
  let currentWidthCm = pmatch ? parseFloat(pmatch[1]) : 20;
  let currentHeightCm = pmatch ? parseFloat(pmatch[2]) : 30;

  const getPhotoSrc = () => item.editedPhotoUrl || item.photo?.url || '';

  // 1. Matted Collages
  if (product.id === 'matted_collages') {
    const type = item.layout?.type || 'grid_2x2';
    let w = 25;
    let h = 25;
    const sizeMatch = item.size?.label?.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (sizeMatch) {
      const d1 = parseFloat(sizeMatch[1]);
      const d2 = parseFloat(sizeMatch[2]);
      if (d1 !== d2) {
        const minD = Math.min(d1, d2);
        const maxD = Math.max(d1, d2);
        if (['grid_1x2_horizontal', 'grid_2x3', 'grid_2x2_landscape', 'grid_2x4', 'grid_2x5'].includes(type)) {
          w = maxD;
          h = minD;
        } else if (['grid_2x1_vertical', 'grid_3x2', 'grid_1top_2bottom', 'grid_2top_1bottom', 'grid_1left_2right', 'grid_2left_1right', 'grid_1left_3right', 'grid_3top_1bottom', 'grid_4x2', 'grid_5x2'].includes(type)) {
          w = minD;
          h = maxD;
        } else {
          w = d1;
          h = d2;
        }
      } else {
        w = d1;
        h = d2;
      }
    }

    return (
      <div 
        className="product-card-matted_collages" 
        style={{ 
          '--frame-color': item.frame?.color || '#111111',
          width: w >= h ? '307.25px' : `${(307.25 * w) / h}px`,
          height: h >= w ? '307.25px' : `${(307.25 * h) / w}px`,
          background: item.frame?.color || '#111111',
          backgroundImage: item.frame?.colorThumb ? `url(${item.frame.colorThumb})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          padding: '5.5%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <div 
          className="matted-frame-mat" 
          style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#ffffff',
            padding: '12%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="collage-grid-container" 
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'grid',
              gridTemplateRows: (() => {
                let gridTemplate = '1fr / 1fr';
                switch(type) {
                  case 'grid_2x2':
                  case 'grid_2x2_landscape':
                    gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                    break;
                  case 'grid_1x2_horizontal': gridTemplate = '1fr / repeat(2, 1fr)'; break;
                  case 'grid_3x2': gridTemplate = 'repeat(3, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_2x3': gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)'; break;
                  case 'grid_1top_2bottom': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_2top_1bottom': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_1left_2right': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_2left_1right': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_asymmetric_4': gridTemplate = '2fr 1fr 2fr / 1fr 1fr'; break;
                  case 'grid_2x1_vertical': gridTemplate = 'repeat(2, 1fr) / 1fr'; break;
                  case 'grid_1left_3right': gridTemplate = 'repeat(3, 1fr) / 3fr 1fr'; break;
                  case 'grid_3top_1bottom': gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)'; break;
                  case 'grid_3x3': gridTemplate = 'repeat(3, 1fr) / repeat(3, 1fr)'; break;
                  case 'grid_4x4': gridTemplate = 'repeat(4, 1fr) / repeat(4, 1fr)'; break;
                  case 'grid_4x2': gridTemplate = 'repeat(4, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_5x2': gridTemplate = 'repeat(5, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_2x4': gridTemplate = 'repeat(2, 1fr) / repeat(4, 1fr)'; break;
                  case 'grid_2x5': gridTemplate = 'repeat(2, 1fr) / repeat(5, 1fr)'; break;
                }
                return gridTemplate.split(' / ')[0];
              })(),
              gridTemplateColumns: (() => {
                let gridTemplate = '1fr / 1fr';
                switch(type) {
                  case 'grid_2x2':
                  case 'grid_2x2_landscape':
                    gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)';
                    break;
                  case 'grid_1x2_horizontal': gridTemplate = '1fr / repeat(2, 1fr)'; break;
                  case 'grid_3x2': gridTemplate = 'repeat(3, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_2x3': gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)'; break;
                  case 'grid_1top_2bottom': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_2top_1bottom': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_1left_2right': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_2left_1right': gridTemplate = 'repeat(2, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_asymmetric_4': gridTemplate = '2fr 1fr 2fr / 1fr 1fr'; break;
                  case 'grid_2x1_vertical': gridTemplate = 'repeat(2, 1fr) / 1fr'; break;
                  case 'grid_1left_3right': gridTemplate = 'repeat(3, 1fr) / 3fr 1fr'; break;
                  case 'grid_3top_1bottom': gridTemplate = 'repeat(2, 1fr) / repeat(3, 1fr)'; break;
                  case 'grid_3x3': gridTemplate = 'repeat(3, 1fr) / repeat(3, 1fr)'; break;
                  case 'grid_4x4': gridTemplate = 'repeat(4, 1fr) / repeat(4, 1fr)'; break;
                  case 'grid_4x2': gridTemplate = 'repeat(4, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_5x2': gridTemplate = 'repeat(5, 1fr) / repeat(2, 1fr)'; break;
                  case 'grid_2x4': gridTemplate = 'repeat(2, 1fr) / repeat(4, 1fr)'; break;
                  case 'grid_2x5': gridTemplate = 'repeat(2, 1fr) / repeat(5, 1fr)'; break;
                }
                return gridTemplate.split(' / ')[1];
              })(),
              gap: '2px'
            }}
          >
            {(item.photos && item.photos.length > 0) ? (
              item.photos.map((p, index) => {
                const customStyle = (() => {
                  switch (type) {
                    case 'grid_1top_2bottom':
                      if (index === 0) return { gridColumn: 'span 2' };
                      break;
                    case 'grid_2top_1bottom':
                      if (index === 2) return { gridColumn: 'span 2' };
                      break;
                    case 'grid_1left_2right':
                      if (index === 0) return { gridRow: 'span 2' };
                      break;
                    case 'grid_2left_1right':
                      if (index === 1) return { gridRow: 'span 2' };
                      break;
                    case 'grid_asymmetric_4':
                      if (index === 0) return { gridRow: '1 / 3', gridColumn: '1' };
                      if (index === 1) return { gridRow: '3 / 4', gridColumn: '1' };
                      if (index === 2) return { gridRow: '1 / 2', gridColumn: '2' };
                      if (index === 3) return { gridRow: '2 / 4', gridColumn: '2' };
                      break;
                    case 'grid_1left_3right':
                      if (index === 0) return { gridRow: 'span 3' };
                      break;
                    case 'grid_3top_1bottom':
                      if (index === 3) return { gridColumn: 'span 3' };
                      break;
                  }
                  return {};
                })();
                return p ? (
                  <img 
                    key={index} 
                    src={adjustPhotoUrl(p.editedPhotoUrl || p.url, isSlotLandscape(type, index))} 
                    alt="" 
                    className="collage-grid-img" 
                    style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, objectFit: 'cover', objectPosition: 'center 20%', transform: `rotate(${p.rotation || 0}deg)`, ...customStyle }} 
                  />
                ) : (
                  <div 
                    key={index}
                    className="collage-grid-img-empty" 
                    style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, backgroundColor: '#e0e0e0', ...customStyle }} 
                  />
                );
              })
            ) : item.photo ? (
              <img src={item.editedPhotoUrl || item.photo.url} alt="" className="collage-grid-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // 2. Float Frames
  if (product.id === 'float_frames') {
    const ffPrintWidthPct = 85;
    const ffPrintHeightPct = 85;
    return (
      <div 
        className="customizer-frame-shadow-wrapper"
        style={{ 
          backgroundColor: item.frame?.color || '#333333', 
          backgroundImage: item.frame?.colorThumb ? `url(${item.frame.colorThumb})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.8), 0 12px 36px rgba(0,0,0,0.25)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '257.27px',
          height: '307.25px',
          padding: '20px',
          boxSizing: 'border-box'
        }}
      >
        <div className="float-frame-inner" style={{ 
          width: '100%', height: '100%', backgroundColor: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="float-frame-photo-container" style={{
            position: 'relative',
            width: `${ffPrintWidthPct}%`, 
            height: `${ffPrintHeightPct}%`, 
            backgroundColor: '#fff',
            padding: '3px',
            boxSizing: 'border-box',
            filter: 'url(#slight-deckled-edge) drop-shadow(2px 6px 12px rgba(0,0,0,0.22))',
            overflow: 'hidden'
          }}>
            {item.photo ? (
              <div className="single-image-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
                <img src={getPhotoSrc()} alt="" className="single-customizer-img" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `rotate(${item.rotation || 0}deg)` }} />
              </div>
            ) : (
              <div className="single-empty-placeholder" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={32} strokeWidth={1.5} color="#888" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Matted Frames and Frames
  if (product.id === 'matted_frame' || product.id === 'frames') {
    let printW = currentWidthCm * 0.71;
    let printH = currentHeightCm * 0.80;

    if (selectedSize?.printSize === '15x23cm' && (selectedSize.label === '30x45cm' || selectedSize.label === '35x35cm')) { printW = 23; printH = 15; }
    else if (selectedSize?.printSize === '20x30cm' && (selectedSize.label === '50x50cm' || selectedSize.label === '50x60cm' || selectedSize.label === '55x76cm')) { printW = 30; printH = 20; }
    else if (selectedSize?.printSize === '30x40cm' && selectedSize.label === '61x61cm') { printW = 40; printH = 30; }
    else if (selectedSize?.printSize === '51x76cm' && selectedSize.label === '102x102cm') { printW = 76; printH = 51; }

    const WOOD_PCT = 8;
    const woodBorderW = currentWidthCm * (WOOD_PCT / 100);
    const woodBorderH = currentHeightCm * (WOOD_PCT / 100);

    const maxMatW = Math.max(0, (currentWidthCm - 5) / 2 - woodBorderW);
    const maxMatH = Math.max(0, (currentHeightCm - 5) / 2 - woodBorderH);

    const borderW = initialCustomBorderWidthCm > 0
      ? Math.min(initialCustomBorderWidthCm, maxMatW)
      : (product.id === 'frames' ? 0 : Math.max(0, (currentWidthCm - printW) / 2 - woodBorderW));
    const borderH = initialCustomBorderWidthCm > 0
      ? Math.min(initialCustomBorderWidthCm, maxMatH)
      : (product.id === 'frames' ? 0 : Math.max(0, (currentHeightCm - printH) / 2 - woodBorderH));

    const matW = printW + 2 * borderW;
    const matH = printH + 2 * borderH;
    const imgPctW = (printW / matW) * 100;
    const imgPctH = (printH / matH) * 100;

    return (
      <div 
        className="customizer-frame-shadow-wrapper"
        style={{ 
          backgroundColor: item.frame?.color || '#111111', 
          backgroundImage: item.frame?.colorThumb ? `url(${item.frame.colorThumb})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 12px 36px rgba(0,0,0,0.25)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '257.27px',
          height: '307.25px',
          padding: '16px',
          boxSizing: 'border-box'
        }}
      >
        <div className="matted-frame-mat" style={{ 
          width: '100%', height: '100%', backgroundColor: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div className="matted-frame-photo-container" style={{
            position: 'relative',
            width: `${imgPctW}%`, 
            height: `${imgPctH}%`, 
            backgroundColor: 'transparent',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2)',
            border: '1px solid rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            {item.photo ? (
              <div className="single-image-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
                <img src={getPhotoSrc()} alt="" className="single-customizer-img" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `rotate(${item.rotation || 0}deg)` }} />
              </div>
            ) : (
              <div className="single-empty-placeholder" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={32} strokeWidth={1.5} color="#888" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Circular Frames
  if (product.id === 'circular_frames') {
    return (
      <div 
        className="product-card-circular_frames" 
        style={{ 
          '--frame-color': item.frame?.color || '#a89f91',
          width: '280px', 
          height: '280px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxSizing: 'border-box',
          background: 'transparent'
        }}
      >
        <div className="product-image-box" style={{ margin: '0 !important' }}>
          {item.photo ? (
            <img 
              src={getPhotoSrc()} 
              alt="" 
              className="product-image" 
              style={{ 
                transform: `rotate(${item.rotation || 0}deg)`
              }} 
            />
          ) : (
            <div 
              className="product-image" 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                backgroundColor: '#e0e0e0', border: 'none'
              }} 
            >
              <ImageIcon size={32} strokeWidth={1.5} color="#888" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 5. Print Pack
  if (product.id === 'print_pack') {
    return (
      <div
        className="customizer-frame-shadow-wrapper product-card-print_pack"
        style={{
          width: '257.27px',
          height: '307.25px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          background: '#f8f8f8',
          padding: '1.5rem',
          overflow: 'visible'
        }}
      >
        <div className="print-pack-container" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {item.photo ? (
            [0, 1, 2, 3].map((i) => (
              <img
                key={i}
                src={getPhotoSrc()}
                alt=""
                className={`print-pack-img img-${i}`}
                style={{
                  width: '55%',
                  aspectRatio: '4/5',
                  objectFit: 'cover',
                  position: 'absolute',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  padding: '8px',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                  transform: i === 0 ? 'rotate(-8deg) translate(-12px, -8px)' : i === 1 ? 'rotate(-3deg) translate(-4px, -4px)' : i === 2 ? 'rotate(2deg) translate(4px, 2px)' : 'rotate(6deg) translate(12px, 8px)',
                  zIndex: i + 1,
                  filter: i < 3 ? `brightness(${0.92 + i * 0.03})` : undefined
                }}
              />
            ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'absolute', zIndex: 10 }}>
              <ImageIcon size={32} strokeWidth={1.5} color="#888" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 6. Deckled Prints
  const hasBorder = selectedBorder === 'white';
  if (product.id === 'deckled_prints') {
    const deckledPadding = initialCustomBorderWidthCm > 0
      ? `${Math.round(initialCustomBorderWidthCm * 3.8)}px`
      : (hasBorder ? '24px' : '6px');
    return (
      <div
        className="customizer-frame-shadow-wrapper"
        style={{
          width: '257.27px',
          height: '307.25px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          background: 'transparent',
          overflow: 'visible'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            filter: 'url(#slight-deckled-edge) drop-shadow(2px 4px 8px rgba(0,0,0,0.18))',
            padding: deckledPadding,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {item.photo ? (
            <img
              src={getPhotoSrc()}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `rotate(${item.rotation || 0}deg)`
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <ImageIcon size={32} strokeWidth={1.5} color="#888" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Prints (Double Stack)
  if (product.id === 'prints') {
    return (
      <div 
        className="product-card-prints"
        style={{
          width: '257.27px',
          height: '307.25px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          background: '#f8f8f8',
          padding: '1.5rem',
          overflow: 'visible'
        }}
      >
        <div className="prints-container">
          <img src={getPhotoSrc()} alt="" className="print-img print-img-back" />
          <img src={getPhotoSrc()} alt="" className="print-img print-img-front" />
        </div>
      </div>
    );
  }

  // 7. Default (Acrylic Prints, Canvas, etc)
  return (
    <div 
      className="customizer-frame-shadow-wrapper"
      style={{ 
        border: (['frames', 'matted_frame', 'float_frames', 'circular_frames'].includes(product.id) && item.frame?.id !== 'none') ? `18px solid ${item.frame?.color || '#333'}` : '1px solid #ddd',
        boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
        width: '257.27px',
        height: '307.25px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        overflow: 'hidden'
      }}
    >
      {item.photo ? (
        <div 
          className="single-image-wrapper" 
          style={{ 
            width: '100%', 
            height: '100%', 
            position: 'relative',
            padding: hasBorder ? '24px' : '0',
            boxSizing: 'border-box',
            backgroundColor: '#fff'
          }} 
        >
          <img 
            src={getPhotoSrc()} 
            alt="" 
            className="single-customizer-img" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: hasBorder ? 'contain' : 'cover', 
              transform: `rotate(${item.rotation || 0}deg)` 
            }} 
          />
        </div>
      ) : (
        <div className="single-empty-placeholder" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ImageIcon size={32} strokeWidth={1.5} color="#888" />
        </div>
      )}
    </div>
  );
}
