import { Outlet } from 'react-router'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="app">
      <Header />

      <main className="site-main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          SAFETICKET은 학습용 사이드 프로젝트입니다. 실제 결제가 이루어지지 않으며 경기 일정은 샘플 데이터입니다.
        </div>
      </footer>
    </div>
  )
}
