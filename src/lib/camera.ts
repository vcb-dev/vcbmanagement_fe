/** iPhone hay từ chối constraint width/height + facingMode exact — thử dần cho tới khi mở được. */
export async function getCameraStream(facing: 'user' | 'environment' = 'user'): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw Object.assign(new Error('Camera chỉ hoạt động trên HTTPS (hoặc localhost)'), { name: 'NotAllowedError' })
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('Trình duyệt không hỗ trợ camera'), { name: 'NotFoundError' })
  }

  const tries: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: facing } } },
    { audio: false, video: { facingMode: facing } },
    { audio: false, video: true },
  ]

  let last: unknown
  for (const constraints of tries) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      last = err
    }
  }
  throw last
}

export function prepareVideoEl(video: HTMLVideoElement) {
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.playsInline = true
  video.muted = true
  video.autoplay = true
  video.setAttribute('muted', '')
}

export async function attachCameraStream(video: HTMLVideoElement, stream: MediaStream) {
  prepareVideoEl(video)
  video.srcObject = stream
  if (video.readyState < 1 || !video.videoWidth) {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Camera không sẵn sàng')), 10_000)
      const done = () => {
        window.clearTimeout(timer)
        video.removeEventListener('loadedmetadata', done)
        resolve()
      }
      video.addEventListener('loadedmetadata', done)
    })
  }
  await video.play().catch(() => undefined)
}

function jpegFromCanvas(canvas: HTMLCanvasElement, quality: number): Blob | null {
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const raw = atob(dataUrl.split(',')[1] ?? '')
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    return new Blob([bytes], { type: 'image/jpeg' })
  } catch {
    return null
  }
}

/** iPhone Safari hay trả `toBlob` null — fallback data URL. */
export function videoToJpeg(video: HTMLVideoElement, maxWidth: number, quality: number): Promise<Blob> {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return Promise.reject(new Error('Camera chưa sẵn sàng'))
  const scale = Math.min(1, maxWidth / width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Không chụp được ảnh'))
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (blob: Blob | null) => {
      if (settled) return
      settled = true
      if (blob && blob.size > 0) resolve(blob)
      else reject(new Error('Không chụp được ảnh'))
    }
    const timer = window.setTimeout(() => finish(jpegFromCanvas(canvas, quality)), 800)
    try {
      canvas.toBlob((blob) => {
        window.clearTimeout(timer)
        finish(blob && blob.size > 0 ? blob : jpegFromCanvas(canvas, quality))
      }, 'image/jpeg', quality)
    } catch {
      window.clearTimeout(timer)
      finish(jpegFromCanvas(canvas, quality))
    }
  })
}
