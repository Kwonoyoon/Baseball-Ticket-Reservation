import { useState, type ComponentProps } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>

/**
 * 눈 아이콘으로 입력한 비밀번호를 보이거나 숨길 수 있는 입력 칸. 처음에는 숨겨져 있다.
 * `<label className="field">` 안에 그대로 넣어 쓰면 된다. (라벨은 첫 번째 입력 요소인 input에 연결된다)
 */
export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="password-input">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-input__toggle"
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        aria-pressed={visible}
        // 누르는 동안 입력 칸의 포커스와 커서 위치를 잃지 않게 한다.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
      >
        {/* 그림은 지금 상태(숨김 = 사선 그은 눈, 보임 = 뜬 눈), 음성 안내는 누르면 일어날 동작이다. */}
        {visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>
    </span>
  )
}
