// Krymper en bild från kameran till max 1600 px på längsta sidan (JPEG).

const MAX = 1600;
const QUALITY = 0.82;

export async function compress(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Kunde inte läsa bilden'));
      i.src = url;
    });
    const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    // Frigör minnet direkt – viktigt på iPad med många bilder.
    canvas.width = canvas.height = 0;
    return { blob: blob || file, width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}
