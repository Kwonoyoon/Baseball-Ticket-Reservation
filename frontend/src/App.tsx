import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { CalendarPage } from './pages/CalendarPage'
import { GamePage } from './pages/GamePage'
import { LoginPage } from './pages/LoginPage'
import { MyPage } from './pages/MyPage'
import { MyReservationsPage } from './pages/MyReservationsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ReservationDetailPage } from './pages/ReservationDetailPage'
import { SchedulePage } from './pages/SchedulePage'
import { SignupPage } from './pages/SignupPage'

const router = createBrowserRouter([
  // 메인 화면은 전체 폭 히어로를 쓰므로 공용 Layout(가운데 정렬된 <main>) 밖에 둔다. 헤더는 Header.tsx를 공유한다.
  { path: '/', element: <SchedulePage /> },
  // 직관 캘린더는 사이드바에서 새 창(팝업)으로 열리므로 헤더·푸터가 있는 Layout 밖에 둔다.
  {
    path: '/my/calendar',
    element: (
      <RequireAuth>
        <CalendarPage />
      </RequireAuth>
    ),
  },
  {
    element: <Layout />,
    children: [
      { path: 'games/:gameId', element: <GamePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      {
        path: 'my',
        element: (
          <RequireAuth>
            <MyPage />
          </RequireAuth>
        ),
      },
      {
        path: 'my/reservations',
        element: (
          <RequireAuth>
            <MyReservationsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'reservations/:reservationId',
        element: (
          <RequireAuth>
            <ReservationDetailPage />
          </RequireAuth>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
