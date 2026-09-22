import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { GamePage } from './pages/GamePage'
import { LoginPage } from './pages/LoginPage'
import { MyReservationsPage } from './pages/MyReservationsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ReservationDetailPage } from './pages/ReservationDetailPage'
import { SchedulePage } from './pages/SchedulePage'
import { SignupPage } from './pages/SignupPage'

const router = createBrowserRouter([
  // 메인 화면은 자체 헤더(HomeHeader)와 전체 폭 히어로를 쓰므로 공용 Layout 밖에 둔다.
  { path: '/', element: <SchedulePage /> },
  {
    element: <Layout />,
    children: [
      { path: 'games/:gameId', element: <GamePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
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
