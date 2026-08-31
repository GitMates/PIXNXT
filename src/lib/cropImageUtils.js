import { resolveCrossOriginMediaUrl } from './r2MediaProxy';

export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues on CodeSandbox
    image.src = url
  })

/**
 * Create an image without crossOrigin attribute (fallback for tainted canvas).
 */
export const createImageNoCors = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })

export function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width, height, rotation) {
  const rotRad = getRadianAngle(rotation)

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

/**
 * Internal cropping helper that takes an already-loaded image element.
 */
function cropFromImage(image, pixelCrop, rotation, flip) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const rotRad = getRadianAngle(rotation)

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)

  // draw rotated image
  ctx.drawImage(image, 0, 0)

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  )

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0)

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(URL.createObjectURL(file))
      } else {
        reject(new Error('Canvas toBlob returned null — canvas may be tainted'))
      }
    }, 'image/jpeg')
  })
}

export default async function getCroppedImg(
  imageSrc,
  pixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
) {
  const proxiedSrc = resolveCrossOriginMediaUrl(imageSrc);
  let src = proxiedSrc;
  if (proxiedSrc && typeof proxiedSrc === 'string' && (proxiedSrc.startsWith('http://') || proxiedSrc.startsWith('https://'))) {
    const separator = proxiedSrc.includes('?') ? '&' : '?';
    src = `${proxiedSrc}${separator}nocache=${Date.now()}`;
  }

  // Attempt 1: load image with crossOrigin (allows getImageData on same-origin / CORS-enabled images)
  try {
    const image = await createImage(src)
    const result = await cropFromImage(image, pixelCrop, rotation, flip)
    if (result) return result
  } catch (_e) {
    // fall through to attempt 2
  }

  // Attempt 2: load image without crossOrigin and use a data URL via fetch + blob
  try {
    const resp = await fetch(proxiedSrc)
    const blob = await resp.blob()
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    const image = await createImage(dataUrl)
    return await cropFromImage(image, pixelCrop, rotation, flip)
  } catch (_e2) {
    // fall through to attempt 3
  }

  // Attempt 3: load without crossOrigin, draw directly (no getImageData — use drawImage crop)
  try {
    const image = await createImageNoCors(proxiedSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y,
      pixelCrop.width, pixelCrop.height,
      0, 0,
      pixelCrop.width, pixelCrop.height
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob((file) => {
        if (file) {
          resolve(URL.createObjectURL(file))
        } else {
          reject(new Error('All crop attempts failed'))
        }
      }, 'image/jpeg')
    })
  } catch (e3) {
    console.error('getCroppedImg: all attempts failed', e3)
    return null
  }
}

