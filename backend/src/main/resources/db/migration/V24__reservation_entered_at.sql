-- 입장 게이트에서 입장 확인된 시각. 한 번 입장한 예매는 다시 입장할 수 없고, 취소·양도도 할 수 없다.
ALTER TABLE reservations ADD COLUMN entered_at DATETIME(6);
