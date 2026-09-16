/** 좌석 배치도 좌표. 생성기로 만든 파일이므로 직접 수정하지 않는다. */

export type StadiumBlock = {
  /** DB seat_sections.zoneCode 와 같은 값 */
  code: string
  grade: string
  number: number
  /** SVG path 데이터 */
  d: string
  labelX: number
  labelY: number
  labelRotate: number
}

export const STADIUM_VIEW_BOX = '0 0 1000 1000'
export const STADIUM_OUTLINE = { cx: 500.0, cy: 470.0, r: 462 }

/** 그라운드 배경. 클릭 대상이 아니다. */
export const FIELD_SHAPES: { d: string; fill: string }[] = [
  { d: 'M 158.0 470.0 A 342 342 0 0 1 169.7 381.5 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#3E9A63' },
  { d: 'M 169.7 381.5 A 342 342 0 0 1 203.8 299.0 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#358B58' },
  { d: 'M 203.8 299.0 A 342 342 0 0 1 258.2 228.2 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#3E9A63' },
  { d: 'M 258.2 228.2 A 342 342 0 0 1 329.0 173.8 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#358B58' },
  { d: 'M 329.0 173.8 A 342 342 0 0 1 411.5 139.7 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#3E9A63' },
  { d: 'M 411.5 139.7 A 342 342 0 0 1 500.0 128.0 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#358B58' },
  { d: 'M 500.0 128.0 A 342 342 0 0 1 588.5 139.7 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#3E9A63' },
  { d: 'M 588.5 139.7 A 342 342 0 0 1 671.0 173.8 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#358B58' },
  { d: 'M 671.0 173.8 A 342 342 0 0 1 741.8 228.2 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#3E9A63' },
  { d: 'M 741.8 228.2 A 342 342 0 0 1 796.2 299.0 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#358B58' },
  { d: 'M 796.2 299.0 A 342 342 0 0 1 830.3 381.5 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#3E9A63' },
  { d: 'M 830.3 381.5 A 342 342 0 0 1 842.0 470.0 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#358B58' },
  { d: 'M 650.0 470.0 A 150 150 0 0 1 350.0 470.0 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#D7A874' },
  { d: 'M 752.0 470.0 A 252 252 0 0 1 248.0 470.0 L 354.0 470.0 A 146 146 0 0 0 646.0 470.0 Z', fill: '#E8ECF3' },
  { d: 'M 338.5 423.7 A 168 168 0 0 1 661.5 423.7 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#CE9A63' },
  { d: 'M 379.6 394.8 A 142 142 0 0 1 620.4 394.8 L 500.0 470.0 A 0 0 0 0 0 500.0 470.0 Z', fill: '#3E9A63' },
]

export const FIELD_LINES: string[] = [
  'M 500.0 470.0 L 587.7 382.3 L 500.0 295.0 L 412.3 382.3 Z',
  'M 500.0 470.0 L 178.6 353.0',
  'M 500.0 470.0 L 821.4 353.0',
]

export const FIELD_MARKS: { cx: number; cy: number; r: number; fill: string }[] = [
  { cx: 500.0, cy: 378.0, r: 17, fill: '#CE9A63' },
  { cx: 500.0, cy: 470.0, r: 8, fill: '#FFFFFF' },
]

export const BASE_LABELS: { x: number; y: number; text: string }[] = [
  { x: 257.1, y: 356.7, text: '3루' },
  { x: 742.9, y: 356.7, text: '1루' },
]

export const STADIUM_BLOCKS: StadiumBlock[] = [
  { code: 'NAVY-01', grade: 'NAVY', number: 1, labelX: 77.6, labelY: 525.6, labelRotate: 82,
    d: 'M 65.7 579.9 A 448 448 0 0 1 52.0 476.3 L 96.0 475.6 A 404 404 0 0 0 108.3 569.1 Z' },
  { code: 'RED-01', grade: 'RED', number: 1, labelX: 129.7, labelY: 540.6, labelRotate: 79,
    d: 'M 123.2 598.3 A 398 398 0 0 1 102.5 489.4 L 144.4 487.4 A 356 356 0 0 0 163.0 584.7 Z' },
  { code: 'ORANGE-01', grade: 'ORANGE', number: 1, labelX: 179.9, labelY: 541.6, labelRotate: 77,
    d: 'M 172.0 592.0 A 350 350 0 0 1 151.2 499.3 L 195.1 495.6 A 306 306 0 0 0 213.2 576.7 Z' },
  { code: 'BLUE-01', grade: 'BLUE', number: 1, labelX: 237.9, labelY: 556.4, labelRotate: 72,
    d: 'M 234.4 609.5 A 300 300 0 0 1 203.5 515.9 L 251.0 508.6 A 252 252 0 0 0 276.9 587.1 Z' },
  { code: 'NAVY-02', grade: 'NAVY', number: 2, labelX: 106.4, labelY: 633.0, labelRotate: 68,
    d: 'M 108.9 688.6 A 448 448 0 0 1 68.9 592.0 L 111.3 580.0 A 404 404 0 0 0 147.3 667.1 Z' },
  { code: 'EXCITING-01', grade: 'EXCITING', number: 1, labelX: 349.4, labelY: 546.7, labelRotate: 63,
    d: 'M 372.3 607.9 A 188 188 0 0 1 313.3 492.3 L 351.1 487.8 A 150 150 0 0 0 398.1 580.1 Z' },
  { code: 'RED-02', grade: 'RED', number: 2, labelX: 168.4, labelY: 649.3, labelRotate: 62,
    d: 'M 179.7 706.2 A 398 398 0 0 1 127.0 608.7 L 166.3 594.1 A 356 356 0 0 0 213.5 681.3 Z' },
  { code: 'ORANGE-02', grade: 'ORANGE', number: 2, labelX: 215.4, labelY: 633.0, labelRotate: 60,
    d: 'M 222.7 683.6 A 350 350 0 0 1 175.5 601.1 L 216.3 584.6 A 306 306 0 0 0 257.6 656.7 Z' },
  { code: 'NAVY-03', grade: 'NAVY', number: 3, labelX: 162.0, labelY: 729.3, labelRotate: 52,
    d: 'M 178.8 782.3 A 448 448 0 0 1 115.2 699.4 L 153.0 676.9 A 404 404 0 0 0 210.4 751.7 Z' },
  { code: 'BLUE-02', grade: 'BLUE', number: 2, labelX: 284.8, labelY: 642.8, labelRotate: 51,
    d: 'M 300.0 693.6 A 300 300 0 0 1 238.4 616.8 L 280.2 593.3 A 252 252 0 0 0 332.0 657.9 Z' },
  { code: 'RED-03', grade: 'RED', number: 3, labelX: 238.1, labelY: 741.2, labelRotate: 44,
    d: 'M 266.1 792.0 A 398 398 0 0 1 186.4 715.0 L 219.5 689.2 A 356 356 0 0 0 290.7 758.0 Z' },
  { code: 'ORANGE-03', grade: 'ORANGE', number: 3, labelX: 276.3, labelY: 709.9, labelRotate: 43,
    d: 'M 298.2 756.0 A 350 350 0 0 1 228.8 691.2 L 262.9 663.4 A 306 306 0 0 0 323.6 720.0 Z' },
  { code: 'TABLE-01', grade: 'TABLE', number: 1, labelX: 352.8, labelY: 633.5, labelRotate: 42,
    d: 'M 396.8 693.3 A 246 246 0 0 1 288.7 596.0 L 333.4 569.3 A 194 194 0 0 0 418.6 646.1 Z' },
  { code: 'NAVY-04', grade: 'NAVY', number: 4, labelX: 240.7, labelY: 808.0, labelRotate: 38,
    d: 'M 270.6 854.8 A 448 448 0 0 1 187.7 791.2 L 218.3 759.6 A 404 404 0 0 0 293.1 817.0 Z' },
  { code: 'BLUE-03', grade: 'BLUE', number: 3, labelX: 358.9, labelY: 707.2, labelRotate: 31,
    d: 'M 391.0 749.5 A 300 300 0 0 1 306.4 699.1 L 337.3 662.5 A 252 252 0 0 0 408.5 704.8 Z' },
  { code: 'RED-04', grade: 'RED', number: 4, labelX: 332.4, labelY: 807.7, labelRotate: 26,
    d: 'M 374.4 847.7 A 398 398 0 0 1 275.1 798.4 L 298.9 763.7 A 356 356 0 0 0 387.6 807.8 Z' },
  { code: 'ORANGE-04', grade: 'ORANGE', number: 4, labelX: 357.2, labelY: 765.3, labelRotate: 26,
    d: 'M 391.8 802.9 A 350 350 0 0 1 306.3 761.5 L 330.7 724.9 A 306 306 0 0 0 405.4 761.0 Z' },
  { code: 'NAVY-05', grade: 'NAVY', number: 5, labelX: 337.0, labelY: 863.6, labelRotate: 22,
    d: 'M 378.0 901.1 A 448 448 0 0 1 281.4 861.1 L 302.9 822.7 A 404 404 0 0 0 390.0 858.7 Z' },
  { code: 'BLUE-04', grade: 'BLUE', number: 4, labelX: 450.9, labelY: 741.6, labelRotate: 10,
    d: 'M 495.8 770.0 A 300 300 0 0 1 398.9 752.4 L 415.1 707.3 A 252 252 0 0 0 496.5 722.0 Z' },
  { code: 'RED-05', grade: 'RED', number: 5, labelX: 442.3, labelY: 842.6, labelRotate: 9,
    d: 'M 494.4 868.0 A 398 398 0 0 1 385.0 851.0 L 397.1 810.8 A 356 356 0 0 0 495.0 826.0 Z' },
  { code: 'ORANGE-05', grade: 'ORANGE', number: 5, labelX: 451.0, labelY: 794.3, labelRotate: 9,
    d: 'M 495.1 820.0 A 350 350 0 0 1 401.2 805.8 L 413.6 763.6 A 306 306 0 0 0 495.7 776.0 Z' },
  { code: 'NAVY-06', grade: 'NAVY', number: 6, labelX: 444.4, labelY: 892.4, labelRotate: 8,
    d: 'M 493.7 918.0 A 448 448 0 0 1 390.1 904.3 L 400.9 861.7 A 404 404 0 0 0 494.4 874.0 Z' },
  { code: 'PREMIUM-01', grade: 'PREMIUM', number: 1, labelX: 500.0, labelY: 690.0, labelRotate: 0,
    d: 'M 580.9 702.3 A 246 246 0 0 1 419.1 702.3 L 436.2 653.2 A 194 194 0 0 0 563.8 653.2 Z' },
  { code: 'NAVY-07', grade: 'NAVY', number: 7, labelX: 555.6, labelY: 892.4, labelRotate: -8,
    d: 'M 609.9 904.3 A 448 448 0 0 1 506.3 918.0 L 505.6 874.0 A 404 404 0 0 0 599.1 861.7 Z' },
  { code: 'ORANGE-06', grade: 'ORANGE', number: 6, labelX: 549.0, labelY: 794.3, labelRotate: -9,
    d: 'M 598.8 805.8 A 350 350 0 0 1 504.9 820.0 L 504.3 776.0 A 306 306 0 0 0 586.4 763.6 Z' },
  { code: 'RED-06', grade: 'RED', number: 6, labelX: 557.7, labelY: 842.6, labelRotate: -9,
    d: 'M 615.0 851.0 A 398 398 0 0 1 505.6 868.0 L 505.0 826.0 A 356 356 0 0 0 602.9 810.8 Z' },
  { code: 'BLUE-05', grade: 'BLUE', number: 5, labelX: 549.1, labelY: 741.6, labelRotate: -10,
    d: 'M 601.1 752.4 A 300 300 0 0 1 504.2 770.0 L 503.5 722.0 A 252 252 0 0 0 584.9 707.3 Z' },
  { code: 'NAVY-08', grade: 'NAVY', number: 8, labelX: 663.0, labelY: 863.6, labelRotate: -22,
    d: 'M 718.6 861.1 A 448 448 0 0 1 622.0 901.1 L 610.0 858.7 A 404 404 0 0 0 697.1 822.7 Z' },
  { code: 'ORANGE-07', grade: 'ORANGE', number: 7, labelX: 642.8, labelY: 765.3, labelRotate: -26,
    d: 'M 693.7 761.5 A 350 350 0 0 1 608.2 802.9 L 594.6 761.0 A 306 306 0 0 0 669.3 724.9 Z' },
  { code: 'RED-07', grade: 'RED', number: 7, labelX: 667.6, labelY: 807.7, labelRotate: -26,
    d: 'M 724.9 798.4 A 398 398 0 0 1 625.6 847.7 L 612.4 807.8 A 356 356 0 0 0 701.1 763.7 Z' },
  { code: 'BLUE-06', grade: 'BLUE', number: 6, labelX: 641.1, labelY: 707.2, labelRotate: -31,
    d: 'M 693.6 699.1 A 300 300 0 0 1 609.0 749.5 L 591.5 704.8 A 252 252 0 0 0 662.7 662.5 Z' },
  { code: 'NAVY-09', grade: 'NAVY', number: 9, labelX: 759.3, labelY: 808.0, labelRotate: -38,
    d: 'M 812.3 791.2 A 448 448 0 0 1 729.4 854.8 L 706.9 817.0 A 404 404 0 0 0 781.7 759.6 Z' },
  { code: 'TABLE-02', grade: 'TABLE', number: 2, labelX: 647.2, labelY: 633.5, labelRotate: -42,
    d: 'M 711.3 596.0 A 246 246 0 0 1 603.2 693.3 L 581.4 646.1 A 194 194 0 0 0 666.6 569.3 Z' },
  { code: 'ORANGE-08', grade: 'ORANGE', number: 8, labelX: 723.7, labelY: 709.9, labelRotate: -43,
    d: 'M 771.2 691.2 A 350 350 0 0 1 701.8 756.0 L 676.4 720.0 A 306 306 0 0 0 737.1 663.4 Z' },
  { code: 'RED-08', grade: 'RED', number: 8, labelX: 761.9, labelY: 741.2, labelRotate: -44,
    d: 'M 813.6 715.0 A 398 398 0 0 1 733.9 792.0 L 709.3 758.0 A 356 356 0 0 0 780.5 689.2 Z' },
  { code: 'BLUE-07', grade: 'BLUE', number: 7, labelX: 715.2, labelY: 642.8, labelRotate: -51,
    d: 'M 761.6 616.8 A 300 300 0 0 1 700.0 693.6 L 668.0 657.9 A 252 252 0 0 0 719.8 593.3 Z' },
  { code: 'NAVY-10', grade: 'NAVY', number: 10, labelX: 838.0, labelY: 729.3, labelRotate: -52,
    d: 'M 884.8 699.4 A 448 448 0 0 1 821.2 782.3 L 789.6 751.7 A 404 404 0 0 0 847.0 676.9 Z' },
  { code: 'ORANGE-09', grade: 'ORANGE', number: 9, labelX: 784.6, labelY: 633.0, labelRotate: -60,
    d: 'M 824.5 601.1 A 350 350 0 0 1 777.3 683.6 L 742.4 656.7 A 306 306 0 0 0 783.7 584.6 Z' },
  { code: 'RED-09', grade: 'RED', number: 9, labelX: 831.6, labelY: 649.3, labelRotate: -62,
    d: 'M 873.0 608.7 A 398 398 0 0 1 820.3 706.2 L 786.5 681.3 A 356 356 0 0 0 833.7 594.1 Z' },
  { code: 'EXCITING-02', grade: 'EXCITING', number: 2, labelX: 650.6, labelY: 546.7, labelRotate: -63,
    d: 'M 686.7 492.3 A 188 188 0 0 1 627.7 607.9 L 601.9 580.1 A 150 150 0 0 0 648.9 487.8 Z' },
  { code: 'NAVY-11', grade: 'NAVY', number: 11, labelX: 893.6, labelY: 633.0, labelRotate: -68,
    d: 'M 931.1 592.0 A 448 448 0 0 1 891.1 688.6 L 852.7 667.1 A 404 404 0 0 0 888.7 580.0 Z' },
  { code: 'BLUE-08', grade: 'BLUE', number: 8, labelX: 762.1, labelY: 556.4, labelRotate: -72,
    d: 'M 796.5 515.9 A 300 300 0 0 1 765.6 609.5 L 723.1 587.1 A 252 252 0 0 0 749.0 508.6 Z' },
  { code: 'ORANGE-10', grade: 'ORANGE', number: 10, labelX: 820.1, labelY: 541.6, labelRotate: -77,
    d: 'M 848.8 499.3 A 350 350 0 0 1 828.0 592.0 L 786.8 576.7 A 306 306 0 0 0 804.9 495.6 Z' },
  { code: 'RED-10', grade: 'RED', number: 10, labelX: 870.3, labelY: 540.6, labelRotate: -79,
    d: 'M 897.5 489.4 A 398 398 0 0 1 876.8 598.3 L 837.0 584.7 A 356 356 0 0 0 855.6 487.4 Z' },
  { code: 'NAVY-12', grade: 'NAVY', number: 12, labelX: 922.4, labelY: 525.6, labelRotate: -82,
    d: 'M 948.0 476.3 A 448 448 0 0 1 934.3 579.9 L 891.7 569.1 A 404 404 0 0 0 904.0 475.6 Z' },
  { code: 'OUTFIELD-01', grade: 'OUTFIELD', number: 1, labelX: 166.8, labelY: 287.2, labelRotate: 299,
    d: 'M 114.9 323.7 A 412 412 0 0 1 169.7 223.8 L 221.0 262.0 A 348 348 0 0 0 174.7 346.4 Z' },
  { code: 'OUTFIELD-02', grade: 'OUTFIELD', number: 2, labelX: 237.2, labelY: 195.5, labelRotate: 316,
    d: 'M 176.7 214.7 A 412 412 0 0 1 259.0 135.8 L 296.4 187.7 A 348 348 0 0 0 226.9 254.3 Z' },
  { code: 'OUTFIELD-03', grade: 'OUTFIELD', number: 3, labelX: 331.9, labelY: 129.2, labelRotate: 334,
    d: 'M 268.4 129.2 A 412 412 0 0 1 370.6 78.8 L 390.7 139.6 A 348 348 0 0 0 304.4 182.2 Z' },
  { code: 'OUTFIELD-04', grade: 'OUTFIELD', number: 4, labelX: 442.2, labelY: 94.4, labelRotate: 351,
    d: 'M 381.6 75.4 A 412 412 0 0 1 494.2 58.0 L 495.1 122.0 A 348 348 0 0 0 400.0 136.7 Z' },
  { code: 'OUTFIELD-05', grade: 'OUTFIELD', number: 5, labelX: 557.8, labelY: 94.4, labelRotate: 369,
    d: 'M 505.8 58.0 A 412 412 0 0 1 618.4 75.4 L 600.0 136.7 A 348 348 0 0 0 504.9 122.0 Z' },
  { code: 'OUTFIELD-06', grade: 'OUTFIELD', number: 6, labelX: 668.1, labelY: 129.2, labelRotate: 386,
    d: 'M 629.4 78.8 A 412 412 0 0 1 731.6 129.2 L 695.6 182.2 A 348 348 0 0 0 609.3 139.6 Z' },
  { code: 'OUTFIELD-07', grade: 'OUTFIELD', number: 7, labelX: 762.8, labelY: 195.5, labelRotate: 404,
    d: 'M 741.0 135.8 A 412 412 0 0 1 823.3 214.7 L 773.1 254.3 A 348 348 0 0 0 703.6 187.7 Z' },
  { code: 'OUTFIELD-08', grade: 'OUTFIELD', number: 8, labelX: 833.2, labelY: 287.2, labelRotate: 421,
    d: 'M 830.3 223.8 A 412 412 0 0 1 885.1 323.7 L 825.3 346.4 A 348 348 0 0 0 779.0 262.0 Z' },
]

export const STADIUM_BLOCK_CODES = new Set(STADIUM_BLOCKS.map((block) => block.code))

