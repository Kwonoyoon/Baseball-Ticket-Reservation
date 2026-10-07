import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQrDecoder } from './qrDecoder'

const jsQR = vi.fn()
vi.mock('jsqr', () => ({ default: (...args: unknown[]) => jsQR(...args) }))

/** 카메라 화면 크기만 정한 video */
function video(width: number, height: number): HTMLVideoElement {
  const element = document.createElement('video')
  Object.defineProperty(element, 'videoWidth', { value: width })
  Object.defineProperty(element, 'videoHeight', { value: height })
  return element
}

/** jsdom에는 canvas가 없으므로 그린 크기만 기억하는 가짜 2D 컨텍스트를 쓴다. */
function fakeCanvas() {
  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  return context
}

describe('createQrDecoder', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    jsQR.mockReset()
  })

  it('브라우저가 QR을 읽을 수 있으면 BarcodeDetector를 쓴다', async () => {
    const detect = vi.fn(async () => [{ rawValue: 'entry-token' }])
    const constructed = vi.fn()
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        static getSupportedFormats = async () => ['ean_13', 'qr_code']
        constructor(options: unknown) {
          constructed(options)
        }
        detect = detect
      },
    )

    const decode = await createQrDecoder()
    const source = video(640, 480)

    await expect(decode(source)).resolves.toBe('entry-token')
    expect(constructed).toHaveBeenCalledWith({ formats: ['qr_code'] })
    expect(detect).toHaveBeenCalledWith(source)
    expect(jsQR).not.toHaveBeenCalled()
  })

  it('BarcodeDetector가 QR을 못 읽으면 jsQR로 화면을 줄여 읽는다', async () => {
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        static getSupportedFormats = async () => ['ean_13']
      },
    )
    const context = fakeCanvas()
    jsQR.mockReturnValue({ data: 'entry-token' })

    const decode = await createQrDecoder()

    await expect(decode(video(1920, 1080))).resolves.toBe('entry-token')
    // 긴 변을 720으로 줄인다.
    expect(context.getImageData).toHaveBeenCalledWith(0, 0, 720, 405)
    expect(jsQR).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 720, 405, { inversionAttempts: 'dontInvert' })
  })

  it('BarcodeDetector가 없는 브라우저도 jsQR로 읽고, QR이 없거나 화면이 아직 없으면 null', async () => {
    fakeCanvas()
    jsQR.mockReturnValue(null)

    const decode = await createQrDecoder()

    await expect(decode(video(640, 480))).resolves.toBeNull()
    await expect(decode(video(0, 0))).resolves.toBeNull()
    expect(jsQR).toHaveBeenCalledTimes(1)
  })
})
