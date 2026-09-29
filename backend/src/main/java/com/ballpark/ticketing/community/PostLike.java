package com.ballpark.ticketing.community;

import java.time.LocalDateTime;

import com.ballpark.ticketing.member.Member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** 한 회원이 같은 글에 남긴 좋아요 하나. (DB 유니크 제약이 중복을 막는 최종 방어선이다) */
@Entity
@Table(name = "community_post_likes")
public class PostLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id")
    private CommunityPost post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected PostLike() {
    }

    public PostLike(CommunityPost post, Member member, LocalDateTime now) {
        this.post = post;
        this.member = member;
        this.createdAt = now;
    }

    public Long getId() {
        return id;
    }
}
