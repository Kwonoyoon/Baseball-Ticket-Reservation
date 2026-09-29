import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applySavedTeamTheme } from './components/TeamThemeApplier'
import './index.css'

// 로그인 상태를 복원하기 전에 마지막 관심 구단 색을 먼저 입혀, 새로고침할 때 기본 색이 번쩍이지 않게 한다.
applySavedTeamTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
