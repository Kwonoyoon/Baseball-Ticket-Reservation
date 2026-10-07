/** 카메라 화면 한 장에서 QR 값을 읽는다. QR이 없으면 null */
export type QrDecoder = (video: HTMLVideoElement) => Promise<string | null>

/** 브라우저 BarcodeDetector 중 여기서 쓰는 부분. (아직 TypeScript DOM 타입에 없다) */
type BarcodeDetectorLike = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> }
type BarcodeDetectorClass = {
  new (options: { formats: string[] }): BarcodeDetectorLike
  getSupportedFormats(): Promise<string[]>
}

/** jsQR로 읽을 때 화면을 이 크기(긴 변)까지 줄인다. 크면 느리고, 입장 QR은 이 크기로도 충분히 읽힌다. */
const MAX_FRAME_SIDE = 720

/**
 * QR 읽는 방법을 고른다. 브라우저의 BarcodeDetector(안드로이드 크롬, 맥 크롬 등)가 QR을 읽을 수 있으면 그것을,
 * 아니면(아이폰 사파리, 윈도우 크롬 등) jsQR을 쓴다. jsQR은 필요할 때만 내려받는다.
 */
export async function createQrDecoder(): Promise<QrDecoder> {
  const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector
  if (Detector && (await Detector.getSupportedFormats().catch((): string[] => [])).includes('qr_code')) {
    const detector = new Detector({ formats: ['qr_code'] })
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null
  }

  const { default: jsQR } = await import('jsqr')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('이 브라우저에서는 QR을 읽을 수 없습니다.')
  return async (video) => {
    const { videoWidth, videoHeight } = video
    if (!videoWidth || !videoHeight) return null
    const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(videoWidth, videoHeight))
    canvas.width = Math.round(videoWidth * scale)
    canvas.height = Math.round(videoHeight * scale)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const frame = context.getImageData(0, 0, canvas.width, canvas.height)
    // 내 티켓 QR은 흰 바탕에 검은 무늬라 반전된 QR까지 찾을 필요는 없다.
    return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
}
