import React, { Component } from 'react';
import CartItemPreview from '../components/CartItemPreview';
import { buildLabPreviewItem, getLabItemPhotoUrl } from './labPhotoUrl';

class ThumbErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Keep lab UI alive if a single framed preview fails
  }

  render() {
    if (this.state.hasError) return this.props.fallback || null;
    return this.props.children;
  }
}

function PlainPhotoFallback({ item, size }) {
  const url = getLabItemPhotoUrl(item);
  if (!url) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: 'transparent',
        }}
      />
    );
  }
  return (
    <img
      src={url}
      alt=""
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        background: 'transparent',
      }}
    />
  );
}

/**
 * Lab thumbnail: product WITH frame via CartItemPreview, scaled into a
 * transparent box. Falls back to plain photo if framed preview throws.
 */
export default function LabFramedThumb({ item, size = 56, onClick, style = {} }) {
  let preview = null;
  try {
    preview = buildLabPreviewItem(item);
  } catch (_) {
    preview = null;
  }

  if (!preview) {
    return (
      <div
        onClick={onClick}
        style={{
          width: size,
          height: size,
          background: 'transparent',
          cursor: onClick ? 'zoom-in' : 'default',
          flexShrink: 0,
          ...style,
        }}
      >
        <PlainPhotoFallback item={item} size={size} />
      </div>
    );
  }

  const nominal = 280;
  const scale = size / Math.max(nominal, 1);

  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        background: 'transparent',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: onClick ? 'zoom-in' : 'default',
        flexShrink: 0,
        ...style,
      }}
    >
      <ThumbErrorBoundary fallback={<PlainPhotoFallback item={item} size={size} />}>
        <div
          style={{
            width: nominal,
            height: nominal,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        >
          <CartItemPreview item={preview} compact />
        </div>
      </ThumbErrorBoundary>
    </div>
  );
}
