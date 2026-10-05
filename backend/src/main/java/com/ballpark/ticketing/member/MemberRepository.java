package com.ballpark.ticketing.member;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    /**
     * 관리자 회원 목록: 아이디·이름·이메일 중 하나에 검색어가 들어간 회원 (검색어가 없으면 전체)
     * 삭제(탈퇴)한 회원은 목록에 넣지 않는다. 예매 이력을 위해 행만 남아 있을 뿐이다.
     */
    @Query("""
            select m from Member m
            where m.status <> com.ballpark.ticketing.member.MemberStatus.WITHDRAWN
              and (:keyword is null
                   or lower(m.username) like concat('%', :keyword, '%')
                   or lower(m.name) like concat('%', :keyword, '%')
                   or lower(m.email) like concat('%', :keyword, '%'))
            order by m.id desc
            """)
    List<Member> search(@Param("keyword") String keyword);
}
