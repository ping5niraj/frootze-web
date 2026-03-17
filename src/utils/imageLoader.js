// Converts an image URL to base64 using HTML Image element
// This avoids CORS fetch restrictions
export function imageToBase64(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (err) {
        console.warn('Canvas conversion failed:', err.message);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('Failed to load image:', url);
      resolve(null);
    };

    // Add cache buster to force fresh load with CORS headers
    img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
  });
}

// Preload all photos in relationships array
export async function preloadPhotos(relationships, currentUser) {
  const photoMap = {};

  // Current user photo
  if (currentUser?.profile_photo) {
    const b64 = await imageToBase64(currentUser.profile_photo);
    if (b64) photoMap[currentUser.id] = b64;
  }

  // All related users photos
  for (const rel of (relationships || [])) {
    const userId = rel.to_user?.id;
    const photoUrl = rel.to_user?.profile_photo;
    if (userId && photoUrl && !photoMap[userId]) {
      const b64 = await imageToBase64(photoUrl);
      if (b64) photoMap[userId] = b64;
    }
  }

  return photoMap;
}
