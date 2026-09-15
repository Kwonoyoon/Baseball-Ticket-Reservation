import { Link } from 'react-router'
import { EmptyState } from '../components/StatusView'

export function NotFoundPage() {
  return (
    <EmptyState title="페이지를 찾을 수 없습니다." description="주소가 바뀌었거나 삭제된 페이지입니다.">
      <Link className="button button--primary" to="/">
        경기 일정으로 이동
      </Link>
    </EmptyState>
  )
}
