import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PgSelect } from './PgSelect'

const options = [
  { value: 'a', label: '신한카드' },
  { value: 'b', label: '삼성카드' },
  { value: 'c', label: '현대카드' },
]

function Harness({ onChange = vi.fn() }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('a')
  return (
    <>
      <PgSelect
        label="카드사"
        value={value}
        options={options}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
      />
      <button type="button">바깥</button>
    </>
  )
}

describe('PgSelect', () => {
  it('누르면 목록이 펼쳐지고, 고른 항목에 표시가 되며 고르면 닫힌다', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const toggle = screen.getByRole('combobox', { name: '카드사' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('option', { name: '신한카드' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(screen.getByRole('option', { name: '삼성카드' }))
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(toggle).toHaveTextContent('삼성카드')
  })

  it('키보드로 열고 위아래로 옮겨 Enter로 고르며, Esc와 바깥 누르기로 닫힌다', async () => {
    render(<Harness />)
    const toggle = screen.getByRole('combobox', { name: '카드사' })
    toggle.focus()

    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(toggle).toHaveTextContent('현대카드')
    expect(toggle).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await userEvent.click(toggle)
    await userEvent.click(screen.getByRole('button', { name: '바깥' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
