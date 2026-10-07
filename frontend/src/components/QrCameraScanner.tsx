import { useEffect, useRef, useState } from 'react'
import { createQrDecoder } from '../lib/qrDecoder'

/** 카메라 화면을 이 간격으로 읽는다. 더 자주 읽어도 손으로 비추는 속도보다 빠를 뿐 배터리만 쓴다. */
const SCAN_INTERVAL_MS = 200

const UNSUPPORTED_MESSAGE =
  '이 브라우저(또는 https가 아닌 주소)에서는 카메라를 쓸 수 없습니다. 아래 입력칸에 QR 값을 넣어 주세요.'

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return '카메라 권한이 막혀 있습니다. 주소창의 권한 설정에서 카메라를 허용해 주세요.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '사용할 수 있는 카메라를 찾지 못했습니다.'
  if (name === 'NotReadableError') return '다른 앱이 카메라를 쓰고 있습니다. 그 앱을 닫고 다시 켜 주세요.'
  return error instanceof Error && error.message ? error.message : '카메라를 켜지 못했습니다.'
}

/**
 * 카메라로 QR을 계속 읽어 onScan에 넘긴다. 같은 QR을 비추고 있으면 같은 값이 계속 오므로 거르는 것은 부르는 쪽 몫이다.
 * 화면에서 빠지면 카메라를 끈다. 카메라는 https(또는 localhost) 주소에서만 켤 수 있다.
 */
export function QrCameraScanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const supported = Boolean(navigator.mediaDevices?.getUserMedia)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!supported) return undefined
    let stopped = false
    let stream: MediaStream | null = null
    let timer: number | undefined

    /** 잡아 둔 카메라를 놓는다. 오류로 카메라 화면이 사라질 때도 불러야 표시등이 꺼지고 다른 앱이 카메라를 쓸 수 있다. */
    const releaseCamera = () => {
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
      if (videoRef.current) videoRef.current.srcObject = null
    }

    const start = async () => {
      try {
        // 휴대폰은 뒷면 카메라를 쓴다. 노트북처럼 한 대뿐이면 그 카메라가 켜진다.
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        // 권한을 묻는 사이에 화면을 떠났으면 바로 끈다.
        if (stopped) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream = media
        const video = videoRef.current
        if (!video) {
          releaseCamera()
          return
        }
        video.srcObject = stream
        await video.play()
        const decode = await createQrDecoder()
        if (stopped) return
        setReady(true)
        const scan = async () => {
          try {
            const value = await decode(video)
            if (value && !stopped) onScanRef.current(value)
          } catch {
            // 화면 한 장을 못 읽은 것뿐이다. 다음 장을 읽는다.
          }
          if (!stopped) timer = window.setTimeout(scan, SCAN_INTERVAL_MS)
        }
        void scan()
      } catch (e) {
        // 카메라를 잡은 뒤 재생이나 QR 해독기 준비가 실패해도 카메라를 놓는다.
        releaseCamera()
        if (!stopped) setError(cameraErrorMessage(e))
      }
    }
    void start()

    return () => {
      stopped = true
      window.clearTimeout(timer)
      releaseCamera()
    }
  }, [supported])

  if (!supported || error) {
    return (
      <p className="entry-camera__error" role="alert">
        {error ?? UNSUPPORTED_MESSAGE}
      </p>
    )
  }
  return (
    <div className="entry-camera">
      <video ref={videoRef} className="entry-camera__video" muted playsInline aria-label="QR 카메라 화면" />
      <span className="entry-camera__frame" aria-hidden="true" />
      <p className="entry-camera__hint">{ready ? '네모 안에 QR 코드를 비춰 주세요.' : '카메라를 켜는 중…'}</p>
    </div>
  )
}
