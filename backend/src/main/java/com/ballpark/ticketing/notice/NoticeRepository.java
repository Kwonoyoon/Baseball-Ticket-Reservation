package com.ballpark.ticketing.notice;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    /** 최신 공지가 먼저. 개수는 pageable로 자른다. */
    List<Notice> findByScopeOrderByIdDesc(NoticeScope scope, Pageable pageable);

    List<Notice> findAllByOrderByIdDesc(Pageable pageable);
}
