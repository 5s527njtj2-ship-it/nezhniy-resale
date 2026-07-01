// Нормализует фото через Canvas — исправляет поворот EXIF (проблема iPhone)
// Также сжимает до maxSize пикселей по длинной стороне
export function normalizePhoto(file, maxSize = 1600) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}
