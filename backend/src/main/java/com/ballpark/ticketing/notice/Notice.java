package com.ballpark.ticketing.notice;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "notices")
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NoticeScope scope;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NoticeCategory category;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 4000)
    private String content;

    /** 작성자는 관리자 id만 남긴다. 화면에는 "관리자"로만 보여 준다. */
    @Column(nullable = false)
    private Long authorId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected Notice() {
    }

    public Notice(NoticeScope scope, NoticeCategory category, String title, String content, Long authorId,
            LocalDateTime now) {
        this.scope = scope;
        this.category = category;
        this.title = title;
        this.content = content;
        this.authorId = authorId;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void edit(NoticeScope scope, NoticeCategory category, String title, String content, LocalDateTime now) {
        this.scope = scope;
        this.category = category;
        this.title = title;
        this.content = content;
        this.updatedAt = now;
    }

    public Long getId() {
        return id;
    }

    public NoticeScope getScope() {
        return scope;
    }

    public NoticeCategory getCategory() {
        return category;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
