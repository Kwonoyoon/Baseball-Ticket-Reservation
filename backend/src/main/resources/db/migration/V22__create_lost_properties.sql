-- 분실물센터: 구장에서 잃어버렸거나 주운 물건을 등록하고 보관 상태를 관리한다.
-- (팀원이 따로 만든 lost_properties 테이블을 이 프로젝트 규칙에 맞게 옮긴 것이다. 날짜 컬럼은 다른 테이블과 같이 DATETIME(6))
CREATE TABLE lost_properties (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    title              VARCHAR(100)  NOT NULL,
    description        VARCHAR(4000) NOT NULL,
    stadium_name       VARCHAR(255)  NOT NULL,
    specific_location  VARCHAR(255)  NULL,
    category           VARCHAR(50)   NOT NULL,
    image_url          VARCHAR(500)  NULL,
    -- 보관 장소는 관리자가 상태를 바꿀 때 적는다.
    storage_location   VARCHAR(255)  NULL,
    -- REPORTED(접수) / KEEPING(보관 중) / CLAIMED(수령 완료) / DISCARDED(폐기)
    status             VARCHAR(20)   NOT NULL,
    lost_or_found_date DATETIME(6)   NULL,
    created_at         DATETIME(6)   NOT NULL
);

CREATE INDEX idx_lost_properties_stadium_status ON lost_properties (stadium_name, status, id DESC);
CREATE INDEX idx_lost_properties_status ON lost_properties (status, id DESC);
