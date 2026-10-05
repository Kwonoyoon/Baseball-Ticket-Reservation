import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { PasswordInput } from './PasswordInput'

function Field() {
  const [value, setValue] = useState('')
  return (
    <label className="field">
      <span className="field__label">비밀번호</span>
      <PasswordInput value={value} onChange={(event) => setValue(event.target.value)} />
    </label>
  )
}

describe('PasswordInput', () => {
  it('처음에는 숨기고, 눈 버튼으로 보였다 숨겼다 한다', async () => {
    render(<Field />)
    const user = userEvent.setup()
    const input = screen.getByLabelText('비밀번호')

    await user.type(input, 'secret123')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: '비밀번호 보기' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('secret123')
    expect(screen.getByRole('button', { name: '비밀번호 숨기기' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '비밀번호 숨기기' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('눈 버튼을 눌러도 폼이 제출되지 않고 입력 칸 포커스가 유지된다', async () => {
    let submitted = false
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitted = true
        }}
      >
        <Field />
      </form>,
    )
    const user = userEvent.setup()
    const input = screen.getByLabelText('비밀번호')

    await user.click(input)
    await user.click(screen.getByRole('button', { name: '비밀번호 보기' }))

    expect(submitted).toBe(false)
    expect(input).toHaveFocus()
  })
})
