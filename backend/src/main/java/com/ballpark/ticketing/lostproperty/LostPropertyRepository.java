package com.ballpark.ticketing.lostproperty;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LostPropertyRepository extends JpaRepository<LostProperty, Long> {

    /** 구장·상태로 거른다. 비워 보낸 조건은 걸지 않는다. 최신 등록이 먼저. */
    @Query("""
            select l from LostProperty l
            where (:stadiumName is null or l.stadiumName = :stadiumName)
              and (:status is null or l.status = :status)
            order by l.id desc
            """)
    List<LostProperty> search(@Param("stadiumName") String stadiumName, @Param("status") LostStatus status,
            Pageable pageable);
}
