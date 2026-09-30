import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamStrip } from './TeamStrip'

const teams = [
  { id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' },
  { id: 2, code: 'OB', name: '두산 베어스', shortName: '두산', primaryColor: '#131230' },
  { id: 3, code: 'HT', name: 'KIA 타이거즈', shortName: 'KIA', primaryColor: '#EA0029' },
]

/** 흐름을 한 프레임씩 직접 돌리려고 requestAnimationFrame을 가로챈다. */
let frames: FrameRequestCallback[] = []
let clock = 0
function step() {
  clock += 50
  const pending = frames
  frames = []
  act(() => pending.forEach((callback) => callback(clock)))
}

function trackX() {
  const track = document.querySelector<HTMLElement>('.team-strip__track')!
  return Number(/translateX\((-?[\d.]+)px\)/.exec(track.style.transform)![1])
}

function renderStrip() {
  render(
    <MemoryRouter>
      <TeamStrip
        teams={teams}
        favoriteTeam={null}
        selectedTeamId={1}
        onSelect={() => {}}
        favoriteSettingPath="/my/account"
      />
    </MemoryRouter>,
  )
}

describe('TeamStrip', () => {
  beforeEach(() => {
    frames = []
    clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('처음에는 로고가 오른쪽으로 흐른다', () => {
    renderStrip()
    const before = trackX()
    step()
    expect(trackX()).toBeGreaterThan(before)
  })

  it('‹ 를 누르면 한 칸 옮긴 뒤 왼쪽으로 계속 흘러, 제자리로 되돌아오지 않는다', () => {
    renderStrip()
    step()

    fireEvent.click(screen.getByRole('button', { name: '이전 구단' }))
    expect(document.querySelector('.team-strip__track')).toHaveClass('is-nudging')
    // 전환 끝 이벤트가 오지 않아도(가려진 탭 등) 시간이 지나면 마무리하고 흐름을 다시 잇는다.
    act(() => vi.advanceTimersByTime(600))
    expect(document.querySelector('.team-strip__track')).not.toHaveClass('is-nudging')

    const before = trackX()
    step()
    expect(trackX()).toBeLessThan(before)
  })

  it('› 를 누르면 다시 오른쪽으로 흐른다', () => {
    renderStrip()
    fireEvent.click(screen.getByRole('button', { name: '이전 구단' }))
    act(() => vi.advanceTimersByTime(600))
    fireEvent.click(screen.getByRole('button', { name: '다음 구단' }))
    act(() => vi.advanceTimersByTime(600))

    const before = trackX()
    step()
    expect(trackX()).toBeGreaterThan(before)
  })

  it('띠가 넓으면 로고를 키워, 같은 구단 로고가 동시에 두 번 보이지 않게 한다', () => {
    // 로고가 보이는 폭을 1052px로 잰 것처럼 만든다. (jsdom은 레이아웃을 계산하지 않는다)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1052)
    renderStrip()

    const strip = screen.getByRole('navigation', { name: '구단 선택' })
    const item = parseFloat(strip.style.getPropertyValue('--strip-item'))
    const step = item + 18
    // 흐르는 로고 3개 한 벌이 "보이는 폭 + 로고 하나"를 덮어야, 한 로고가 빠져나간 뒤에야 같은 로고가 들어온다.
    expect(3 * step).toBeGreaterThanOrEqual(1052 + item)
  })

  it('좁은 띠에서는 로고를 기본 크기(80px)로 둔다', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200)
    renderStrip()

    expect(screen.getByRole('navigation', { name: '구단 선택' }).style.getPropertyValue('--strip-item')).toBe('80px')
  })
})
