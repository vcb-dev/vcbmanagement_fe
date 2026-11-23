import { getCameraStream, videoToJpeg } from '@/lib/camera'

const MAX_WIDTH = 640
const JPEG_QUALITY = 0.72

export function captureJpeg(video: HTMLVideoElement): Promise<Blob> {
  return videoToJpeg(video, MAX_WIDTH, JPEG_QUALITY)
}

export async function openUserCamera(): Promise<MediaStream> {
  return getCameraStream('user')
}
