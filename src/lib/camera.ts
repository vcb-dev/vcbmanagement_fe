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
