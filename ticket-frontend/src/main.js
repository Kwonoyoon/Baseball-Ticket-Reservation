import QRCode from 'qrcode'
import './style.css'

const QR_REFRESH_MS = 30_000
const AUTH_KEY = 'ballpark-myticket.auth'
const LOGOS = { LG: 'lg_logo.svg', DOOSAN: 'dusan_logo.svg', KIWOOM: 'kiwoom_logo.svg', SSG: 'ssg_logo.svg', KT: 'kt_logo.svg', HANWHA: 'hanwha_logo.svg', SAMSUNG: 'samsung_logo.svg', KIA: 'kia_logo.svg', NC: 'nc_logo.svg', LOTTE: 'lotte_logo.svg' }
const app = document.querySelector('#app')
let auth = null
let reservations = [{
  id: 1,
  reservationNumber: 'BP-20260916-0001',
  status: 'CONFIRMED',
  game: {
    id: 1,
    startAt: '2026-09-19T18:30:00',
    awayTeam: { code: 'KT', name: 'KT 위즈', shortName: 'KT' },
    homeTeam: { code: 'HANWHA', name: '한화 이글스', shortName: '한화' },
    stadium: { name: '대전 한화생명볼파크' },
  },
  seats: [{ sectionName: '내야 지정석', rowNo: 12, seatNo: 8 }],
}]
let currentTicket = reservations[0]
let expiresAt = 0
let generation = 0

function loadAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) } catch { return null }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
}

function formatGameAt(value) {
  const date = new Date(`${value.slice(0, 19)}+09:00`)
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${date.getMonth() + 1}.${date.getDate()} (${weekday}) ${value.slice(11, 16)}`
}

async function api(path, options = {}) {
  const headers = { Accept: 'application/json', ...options.headers }
  if (auth?.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`
  const response = await fetch(`/api${path}`, { ...options, headers })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message || '요청을 처리하지 못했습니다.')
  }
  return response.status === 204 ? undefined : response.json()
}

function renderLogin(message = '') {
  app.innerHTML = `
    <section class="login-card" aria-labelledby="login-title">
      <div class="brand brand--dark"><span class="brand-ball" aria-hidden="true"></span>볼파크 <em>티켓</em></div>
      <p class="eyebrow">MOBILE TICKET</p>
      <h1 id="login-title">내 QR 티켓</h1>
      <p class="login-card__description">예매한 경기의 QR 티켓을 확인하려면 로그인해 주세요.</p>
      ${message ? `<p class="form-message" role="alert">${escapeHtml(message)}</p>` : ''}
      <form id="login-form" class="login-form">
        <label>아이디<input name="username" autocomplete="username" autocapitalize="none" required /></label>
        <label>비밀번호<input type="password" name="password" autocomplete="current-password" required /></label>
        <button type="submit">QR 티켓 불러오기</button>
      </form>
    </section>`
  document.querySelector('#login-form').addEventListener('submit', login)
}

async function login(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const button = event.currentTarget.querySelector('button')
  button.disabled = true
  try {
    auth = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) })
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
    await loadTickets()
  } catch (error) {
    renderLogin(error.message)
  } finally {
    button.disabled = false
  }
}

async function loadTickets() {
  try {
    reservations = (await api('/reservations/me')).filter((item) => item.status === 'CONFIRMED')
    const requestedId = Number(new URLSearchParams(location.search).get('reservationId'))
    currentTicket = reservations.find((item) => item.id === requestedId) || reservations[0] || null
    renderTicket()
  } catch (error) {
    if (error.message.includes('인증')) {
      localStorage.removeItem(AUTH_KEY)
      auth = null
      renderLogin('로그인이 만료되었습니다. 다시 로그인해 주세요.')
      return
    }
    renderLogin(error.message)
  }
}

function teamBlock(team, role) {
  const logo = LOGOS[team.code]
  return `<div class="team team--${role}"><span class="team__role">${role === 'away' ? '원정' : '홈'}</span>${logo ? `<img src="/${logo}" alt="${escapeHtml(team.name)} 로고" />` : `<span class="team__fallback">${escapeHtml(team.shortName)}</span>`}<strong>${escapeHtml(team.name)}</strong></div>`
}

function renderTicket() {
  if (!currentTicket) {
    app.innerHTML = `<section class="empty-card"><h1>예매 완료된 티켓이 없습니다.</h1><p>예매가 완료된 뒤 이 페이지에서 QR 티켓을 확인할 수 있습니다.</p><button id="logout-button">로그아웃</button></section>`
    document.querySelector('#logout-button').addEventListener('click', logout)
    return
  }
  const { game } = currentTicket
  const options = reservations.map((item) => `<option value="${item.id}" ${item.id === currentTicket.id ? 'selected' : ''}>${escapeHtml(item.game.awayTeam.shortName)} vs ${escapeHtml(item.game.homeTeam.shortName)} · ${formatGameAt(item.game.startAt)}</option>`).join('')
  const seats = currentTicket.seats.map((seat) => `${escapeHtml(seat.sectionName)} ${seat.rowNo}열 ${seat.seatNo}번`).join(', ')
  app.innerHTML = `
    <section class="ticket-shell" aria-labelledby="ticket-title">
      <header class="topbar"><div class="brand"><span class="brand-ball" aria-hidden="true"></span>볼파크 <em>티켓</em></div><span class="active-badge">입장 가능</span></header>
      <div class="ticket-content">
        <div class="league-line"><strong>KBO 리그</strong><span>·</span><span>${formatGameAt(game.startAt)}</span></div>
        <div class="ticket-picker">${reservations.length > 1 ? `<label>다른 티켓 <select id="ticket-select">${options}</select></label>` : '<span>예매 완료</span>'}</div>
        <div class="matchup">${teamBlock(game.awayTeam, 'away')}<span class="matchup__versus">경기 전</span>${teamBlock(game.homeTeam, 'home')}</div>
        <p class="stadium-name">${escapeHtml(game.stadium.name)}</p>
        <div class="qr-section">
          <div class="qr-frame"><img id="qr-image" alt="입장 확인용 QR 코드" /></div>
          <p class="entry-guide">입장 게이트에서 QR 코드를 제시해 주세요.</p>
          <p class="refresh-guide"><span class="timer" id="timer">00:30</span> 후 새 QR 코드로 갱신됩니다.</p>
          <button class="refresh-button" id="refresh-button" type="button" aria-label="QR 코드 새로고침"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.9-4L3 9m0 0V4m0 5h5M4 13a8 8 0 0 0 14.9 4L21 15m0 0v5m0-5h-5" /></svg>새로고침</button>
        </div>
        <dl class="ticket-details"><div><dt>예매번호</dt><dd>${escapeHtml(currentTicket.reservationNumber)}</dd></div><div><dt>좌석</dt><dd>${seats}</dd></div></dl>
      </div>
    </section>
    <p class="notice">보안을 위해 QR 코드는 30초마다 자동으로 변경됩니다.</p>`
  document.querySelector('#ticket-select')?.addEventListener('change', (event) => { currentTicket = reservations.find((item) => item.id === Number(event.target.value)); renderTicket() })
  document.querySelector('#refresh-button').addEventListener('click', refreshQr)
  refreshQr()
}

function logout() {
  localStorage.removeItem(AUTH_KEY)
  auth = null
  currentTicket = null
  renderLogin()
}

async function refreshQr() {
  const qrImage = document.querySelector('#qr-image')
  const refreshButton = document.querySelector('#refresh-button')
  if (!currentTicket || !qrImage || !refreshButton) return
  const currentGeneration = ++generation
  const issuedAt = Date.now()
  expiresAt = issuedAt + QR_REFRESH_MS
  refreshButton.disabled = true
  try {
    const image = await QRCode.toDataURL(JSON.stringify({ type: 'BALLPARK_ENTRY_TICKET', version: 1, reservationId: currentTicket.id, reservationNumber: currentTicket.reservationNumber, issuedAt, expiresAt, nonce: crypto.randomUUID() }), { errorCorrectionLevel: 'M', margin: 2, width: 480, color: { dark: '#0b1b33', light: '#ffffff' } })
    if (currentGeneration === generation) qrImage.src = image
  } finally {
    if (currentGeneration === generation) refreshButton.disabled = false
  }
}

setInterval(() => {
  const timer = document.querySelector('#timer')
  if (!timer || !currentTicket) return
  const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
  timer.textContent = `00:${String(seconds).padStart(2, '0')}`
  if (seconds === 0) refreshQr()
}, 250)

renderTicket()
