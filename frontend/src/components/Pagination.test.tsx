import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

const numbers = () => screen.getAllByRole('button', { name: /^\d+쪽$/ }).map((button) => button.textContent)

describe('Pagination', () => {
  it('쪽 번호를 5개씩 묶어 지금 쪽이 든 묶음을 보여 준다', () => {
    render(<Pagination page={7} totalPages={12} onChange={vi.fn()} />)

    expect(numbers()).toEqual(['6', '7', '8', '9', '10'])
    expect(screen.getByRole('button', { name: '7쪽' })).toHaveAttribute('aria-current', 'page')
  })

  it('이전·다음은 한 쪽씩, 처음·마지막은 끝으로 가고 지금 쪽을 다시 누르면 아무 일도 없다', async () => {
    const onChange = vi.fn()
    render(<Pagination page={6} totalPages={12} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: '이전 쪽' }))
    await userEvent.click(screen.getByRole('button', { name: '다음 쪽' }))
    await userEvent.click(screen.getByRole('button', { name: '처음 쪽' }))
    await userEvent.click(screen.getByRole('button', { name: '마지막 쪽' }))
    await userEvent.click(screen.getByRole('button', { name: '6쪽' }))

    expect(onChange.mock.calls.map(([page]) => page)).toEqual([5, 7, 1, 12])
  })

  it('쪽이 없으면 그리지 않는다', () => {
    const { container } = render(<Pagination page={1} totalPages={0} onChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
