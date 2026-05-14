export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string | null> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Safety check for dimensions
  const width = Math.floor(pixelCrop.width);
  const height = Math.floor(pixelCrop.height);

  if (!width || !height) {
    return null;
  }

  canvas.width = width;
  canvas.height = height;

  // Use the native source clipping drawImage call
  ctx.drawImage(
    image,
    Math.floor(pixelCrop.x),
    Math.floor(pixelCrop.y),
    width,
    height,
    0,
    0,
    width,
    height
  );

  // Return as base64 string
  return canvas.toDataURL('image/jpeg', 0.95);
};

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => {
      console.error('Failed to load image for cropping:', error);
      reject(error);
    });
    // Only set crossOrigin if it's not a data URL to avoid security blocks
    if (url && !url.startsWith('data:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });
