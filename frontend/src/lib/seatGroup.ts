/**
 * 같은 열에서 커서를 올린 좌석을 포함하는 연속 좌석 묶음을 찾는다.
 *
 * 커서 자리부터 오른쪽으로 채우는 것을 우선하고, 오른쪽이 막혀 있으면 왼쪽으로 확장한다.
 * 조건을 만족하는 묶음이 없으면 {@code null}을 돌려준다.
 *
 * @param seatsPerRow 한 열의 좌석 수
 * @param seatNo      커서를 올린 좌석 번호 (1부터)
 * @param quantity    선택할 매수
 * @param isAvailable 해당 좌석을 고를 수 있는지 (판매·타인 선점이 아니면 true)
 */
export function findAdjacentGroup(
  seatsPerRow: number,
  seatNo: number,
  quantity: number,
  isAvailable: (seatNo: number) => boolean,
): number[] | null {
  if (quantity <= 0 || quantity > seatsPerRow) return null
  if (seatNo < 1 || seatNo > seatsPerRow || !isAvailable(seatNo)) return null

  const candidates: number[][] = []
  for (let start = seatNo - quantity + 1; start <= seatNo; start++) {
    if (start < 1 || start + quantity - 1 > seatsPerRow) continue
    const group = Array.from({ length: quantity }, (_, index) => start + index)
    if (group.every(isAvailable)) candidates.push(group)
  }
  if (candidates.length === 0) return null

  // 커서 자리가 맨 앞이 되는 묶음(오른쪽으로 채우기)을 우선하고, 없으면 가장 오른쪽 묶음을 쓴다.
  return candidates.find((group) => group[0] === seatNo) ?? candidates[candidates.length - 1]
}
