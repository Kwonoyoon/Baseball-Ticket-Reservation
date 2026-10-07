import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAdmin, RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { TeamThemeApplier } from './components/TeamThemeApplier'
import { AccountPage } from './pages/AccountPage'
import { AdminCommunityReportsPage } from './pages/AdminCommunityReportsPage'
import { AdminEntryPage } from './pages/AdminEntryPage'
import { AdminMembersPage } from './pages/AdminMembersPage'
import { CalendarPage } from './pages/CalendarPage'
import { CommunityBoardPage } from './pages/CommunityBoardPage'
import { CommunityPostFormPage } from './pages/CommunityPostFormPage'
import { CommunityPostPage } from './pages/CommunityPostPage'
import { NotificationProvider } from './notifications/NotificationProvider'
import { GamePage } from './pages/GamePage'
import { LoginPage } from './pages/LoginPage'
import { MockCheckoutPage } from './pages/MockCheckoutPage'
import { MyReservationsPage } from './pages/MyReservationsPage'
import { MyTicketPage } from './pages/MyTicketPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NotificationSettingsPage } from './pages/NotificationSettingsPage'
import { PasswordChangePage } from './pages/PasswordChangePage'
import { PaymentFailPage, PaymentSuccessPage } from './pages/PaymentResultPage'
import { ProfileEditPage } from './pages/ProfileEditPage'
import { ReservationDetailPage } from './pages/ReservationDetailPage'
import { SchedulePage } from './pages/SchedulePage'
import { SignupPage } from './pages/SignupPage'
import { TransferMarketPage } from './pages/TransferMarketPage'
import { WithdrawPage } from './pages/WithdrawPage'

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
  // 가짜 PG 결제창. 실제 PG의 결제창처럼 사이트 헤더 없이 띄우므로 Layout 밖에 둔다.
  {
    path: '/mock-pg/checkout',
    element: (
      <RequireAuth>
        <MockCheckoutPage />
      </RequireAuth>
    ),
  },
  {
    element: <Layout />,
    children: [
      { path: 'games/:gameId', element: <GamePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      // 커뮤니티 입구와 구단 게시판은 한 화면이다. (구단 줄 + 게시판) 입구는 관심 구단부터 보여 준다.
      { path: 'community', element: <CommunityBoardPage /> },
      { path: 'community/:teamId', element: <CommunityBoardPage /> },
      {
        path: 'community/:teamId/write',
        element: (
          <RequireAuth>
            <CommunityPostFormPage />
          </RequireAuth>
        ),
      },
      { path: 'community/:teamId/posts/:postId', element: <CommunityPostPage /> },
      {
        path: 'community/:teamId/posts/:postId/edit',
        element: (
          <RequireAuth>
            <CommunityPostFormPage />
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
        path: 'transfers',
        element: (
          <RequireAuth>
            <TransferMarketPage />
          </RequireAuth>
        ),
      },
      {
        path: 'my/ticket',
        element: (
          <RequireAuth>
            <MyTicketPage />
          </RequireAuth>
        ),
      },
      {
        path: 'payments/success',
        element: (
          <RequireAuth>
            <PaymentSuccessPage />
          </RequireAuth>
        ),
      },
      {
        path: 'payments/fail',
        element: (
          <RequireAuth>
            <PaymentFailPage />
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
      {
        path: 'my/account',
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
      {
        path: 'my/account/password',
        element: (
          <RequireAuth>
            <PasswordChangePage />
          </RequireAuth>
        ),
      },
      {
        path: 'my/account/profile',
        element: (
          <RequireAuth>
            <ProfileEditPage />
          </RequireAuth>
        ),
      },
      {
        path: 'my/account/withdraw',
        element: (
          <RequireAuth>
            <WithdrawPage />
          </RequireAuth>
        ),
      },
      // 관리자 페이지 입구. 지금은 회원 관리 하나뿐이라 바로 보낸다. (메뉴가 늘면 여기에 관리자 홈을 둔다)
      { path: 'admin', element: <Navigate to="/admin/members" replace /> },
      {
        path: 'admin/members',
        element: (
          <RequireAdmin>
            <AdminMembersPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/community/reports',
        element: (
          <RequireAdmin>
            <AdminCommunityReportsPage />
          </RequireAdmin>
        ),
      },
      // 입장 게이트에서 관람객의 내 티켓 QR을 읽는다.
      {
        path: 'admin/entry',
        element: (
          <RequireAdmin>
            <AdminEntryPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'notifications/settings',
        element: (
          <RequireAuth>
            <NotificationSettingsPage />
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
      <TeamThemeApplier />
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </AuthProvider>
  )
}
