import { getCameraStream } from '@/lib/camera'

const MAX_WIDTH = 960
const JPEG_QUALITY = 0.85

export function captureJpeg(video: HTMLVideoElement): Promise<Blob> {
  if (!video.videoWidth) return Promise.reject(new Error('Camera chưa sẵn sàng'))
  const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Không chụp được ảnh'))), 'image/jpeg', JPEG_QUALITY)
  })
}

export async function openUserCamera(): Promise<MediaStream> {
  return getCameraStream('user')
}
