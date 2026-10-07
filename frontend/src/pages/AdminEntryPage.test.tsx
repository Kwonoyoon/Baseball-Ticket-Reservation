import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EntryVerification, Reservation } from '../api/types'
import { AuthProvider } from '../auth/AuthProvider'
import { RequireAdmin } from '../auth/RequireAuth'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { AdminEntryPage } from './AdminEntryPage'

const lg = { id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' }
const kia = { id: 8, code: 'KIA', name: 'KIA 타이거즈', shortName: 'KIA', primaryColor: '#EA0029' }

function seat(seatNo: number) {
  return {
    sectionId: 11,
    sectionCode: 'NAVY-03',
    sectionName: '네이비석 3번',
    grade: 'NAVY' as const,
    rowNo: 3,
    seatNo,
    seatRows: 10,
    seatsPerRow: 22,
    price: 12000,
  }
}

const reservation: Reservation = {
  id: 7,
  reservationNumber: 'BP20261007-0007',
  status: 'CONFIRMED',
  totalPrice: 24000,
  paymentMethod: 'CARD',
  createdAt: '2026-10-01T10:00:00',
  canceledAt: null,
  paymentDeadline: null,
  cancelable: true,
  game: {
    id: 3,
    startAt: '2026-10-07T18:30:00',
    homeTeam: lg,
    awayTeam: kia,
    stadium: { id: 1, name: '서울종합운동장 야구장', city: '서울', code: 'JAMSIL' },
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
  },
  seats: [seat(5), seat(6)],
}

const admitted: EntryVerification = {
  admitted: true,
  result: 'ADMITTED',
  message: '입장 확인되었습니다.',
  reservation,
  entryOpensAt: '2026-10-07T17:00:00',
}

const notYetOpen: EntryVerification = {
  admitted: false,
  result: 'NOT_YET_OPEN',
  message: '아직 입장 시간이 아닙니다.',
  reservation,
  entryOpensAt: '2026-10-07T17:00:00',
}

const invalid: EntryVerification = {
  admitted: false,
  result: 'INVALID_TOKEN',
  message: '올바른 입장 QR이 아닙니다.',
  reservation: null,
  entryOpensAt: null,
}

/** QR 값별 검증 결과를 정해 둔 가짜 서버. 돌려준 fetch mock으로 검증 요청을 센다. */
function renderEntryPage(results: Record<string, EntryVerification | 'fail'> = {}, role: 'ADMIN' | 'MEMBER' = 'ADMIN') {
  const fetchMock = restoreSessionAs(testMember(role), (url, init) => {
    if (url !== '/api/admin/entry/verify' || init?.method !== 'POST') return undefined
    const { token } = JSON.parse(String(init.body)) as { token: string }
    const result = results[token] ?? invalid
    return result === 'fail'
      ? jsonResponse(500, { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' })
      : jsonResponse(200, result)
  })
  const router = createMemoryRouter(
    [
      {
        path: '/admin/entry',
        element: (
          <RequireAdmin>
            <AdminEntryPage />
          </RequireAdmin>
        ),
      },
    ],
    { initialEntries: ['/admin/entry'] },
  )
  const view = render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  const verifyCalls = () => fetchMock.mock.calls.filter((call) => call[0] === '/api/admin/entry/verify')
  return { ...view, verifyCalls }
}

async function submitManually(value: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByRole('textbox', { name: 'QR 값 직접 넣기' }), value)
  await user.click(screen.getByRole('button', { name: '확인' }))
}

const resultPanel = () => screen.getByRole('region', { name: '확인 결과' })

/** 결과 칸은 새 결과마다 새로 그려지므로 매번 다시 찾는다. */
async function expectVerdict(verdict: string) {
  await waitFor(() => expect(within(resultPanel()).getByText(verdict)).toBeInTheDocument(), { timeout: 2000 })
}

/** 카메라와 BarcodeDetector를 흉내 낸다. 카메라에 비친 QR 값을 바꿀 수 있다. */
function fakeCamera() {
  const camera = { value: null as string | null, stop: vi.fn() }
  const stream = { getTracks: () => [{ stop: camera.stop }] } as unknown as MediaStream
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator) as Navigator, {
    mediaDevices: { getUserMedia: vi.fn(async () => stream) },
    vibrate: vi.fn(() => true),
  }))
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  class FakeBarcodeDetector {
    static getSupportedFormats = async () => ['qr_code']
    detect = async () => (camera.value ? [{ rawValue: camera.value }] : [])
  }
  vi.stubGlobal('BarcodeDetector', FakeBarcodeDetector)
  return camera
}

describe('AdminEntryPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('회원에게는 관리자 전용 안내만 보여 준다', async () => {
    renderEntryPage({}, 'MEMBER')
    expect(await screen.findByText('관리자만 볼 수 있는 화면입니다.')).toBeInTheDocument()
  })

  it('카메라를 쓸 수 없는 브라우저에서는 직접 넣는 칸을 안내한다', async () => {
    renderEntryPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('카메라를 쓸 수 없습니다')
    expect(screen.getByRole('textbox', { name: 'QR 값 직접 넣기' })).toBeInTheDocument()
  })

  it('입장할 수 있는 QR이면 입장 확인과 예매번호·좌석을 보여 준다', async () => {
    const { verifyCalls } = renderEntryPage({ 'token-ok': admitted })
    await submitManually('token-ok')

    await expectVerdict('입장 확인')
    expect(resultPanel()).toHaveClass('is-admitted')
    expect(within(resultPanel()).getByText('BP20261007-0007')).toBeInTheDocument()
    expect(within(resultPanel()).getByText('좌석 2매')).toBeInTheDocument()
    expect(within(resultPanel()).getByText('네이비석 3번 3열 5번')).toBeInTheDocument()
    expect(within(resultPanel()).getByText('네이비석 3번 3열 6번')).toBeInTheDocument()
    expect(verifyCalls()[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ token: 'token-ok' }) })
    // 다음 사람을 바로 넣을 수 있게 입력칸을 비운다.
    expect(screen.getByRole('textbox', { name: 'QR 값 직접 넣기' })).toHaveValue('')
  })

  it('입장 시간 전이면 거부하고 입장 시작 시각을 알려 준다', async () => {
    renderEntryPage({ early: notYetOpen })
    await submitManually('early')

    await expectVerdict('입장 불가')
    expect(resultPanel()).toHaveClass('is-rejected')
    expect(resultPanel()).toHaveTextContent('아직 입장 시간이 아닙니다.')
    expect(resultPanel()).toHaveTextContent('10월 7일 (수) 17:00부터 입장할 수 있습니다.')
  })

  it('예매를 알 수 없는 QR은 거부 이유만 보여 준다', async () => {
    renderEntryPage()
    await submitManually('forged')

    await expectVerdict('입장 불가')
    expect(resultPanel()).toHaveTextContent('올바른 입장 QR이 아닙니다.')
    expect(within(resultPanel()).queryByText('예매번호')).not.toBeInTheDocument()
  })

  it('서버에 닿지 못하면 확인 실패를 알린다', async () => {
    renderEntryPage({ broken: 'fail' })
    await submitManually('broken')

    await expectVerdict('확인 실패')
    expect(resultPanel()).toHaveTextContent('서버 오류가 발생했습니다.')
  })

  it('카메라로 읽은 QR을 확인하고, 같은 QR은 다시 보내지 않으며 다음 QR을 이어서 확인한다', async () => {
    const camera = fakeCamera()
    const { verifyCalls } = renderEntryPage({ first: admitted, second: notYetOpen })

    expect(await screen.findByText('네모 안에 QR 코드를 비춰 주세요.')).toBeInTheDocument()
    camera.value = 'first'
    await expectVerdict('입장 확인')
    expect(navigator.vibrate).toHaveBeenCalledWith(120)

    // 같은 QR을 계속 비추고 있어도 한 번만 확인한다.
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(verifyCalls()).toHaveLength(1)

    camera.value = 'second'
    await expectVerdict('입장 불가')
    expect(verifyCalls()).toHaveLength(2)

    const history = screen.getByRole('region', { name: '최근 확인' })
    const items = within(history).getAllByRole('listitem')
    expect(items.map((item) => item.querySelector('strong')?.textContent)).toEqual(['입장 시간 전', '입장'])
  })

  it('카메라를 끄면 카메라 스트림을 멈춘다', async () => {
    const camera = fakeCamera()
    renderEntryPage()

    expect(await screen.findByText('네모 안에 QR 코드를 비춰 주세요.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '카메라 끄기' }))

    await waitFor(() => expect(camera.stop).toHaveBeenCalled())
    expect(screen.queryByLabelText('QR 카메라 화면')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '카메라 켜기' })).toBeInTheDocument()
  })
})
