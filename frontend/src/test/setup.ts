import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { endSession } from '../api/client'

afterEach(() => {
  cleanup()
  // 액세스 토큰은 모듈 메모리에 있으므로 테스트끼리 섞이지 않게 비운다.
  endSession()
  localStorage.clear()
})
