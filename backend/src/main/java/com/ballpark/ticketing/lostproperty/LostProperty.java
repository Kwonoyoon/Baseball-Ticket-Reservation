package com.ballpark.ticketing.lostproperty;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 분실물·습득물 한 건. 처음에는 접수(REPORTED) 상태이고, 관리자가 보관·수령·폐기로 바꾼다. */
@Entity
@Table(name = "lost_properties")
public class LostProperty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 4000)
    private String description;

    /** 구장 이름 (예: 서울종합운동장 야구장 (잠실)) */
    @Column(nullable = false)
    private String stadiumName;

    /** 세부 위치 (예: 1루 블루석 12열) */
    private String specificLocation;

    /** 카테고리 (예: 전자기기, 지갑/신분증, 의류) */
    @Column(nullable = false, length = 50)
    private String category;

    /** 사진 주소. 파일을 올리지는 않고 주소만 받는다. */
    @Column(length = 500)
    private String imageUrl;

    /** 보관 장소. 관리자가 상태를 바꿀 때 적는다. */
    private String storageLocation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LostStatus status;

    /** 분실·습득한 때 */
    private LocalDateTime lostOrFoundDate;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected LostProperty() {
    }

    public LostProperty(String title, String description, String stadiumName, String specificLocation,
            String category, String imageUrl, LocalDateTime lostOrFoundDate, LocalDateTime now) {
        this.title = title;
        this.description = description;
        this.stadiumName = stadiumName;
        this.specificLocation = specificLocation;
        this.category = category;
        this.imageUrl = imageUrl;
        this.lostOrFoundDate = lostOrFoundDate;
        this.status = LostStatus.REPORTED;
        this.createdAt = now;
    }

    /** 관리자용 상태 변경. 보관 장소를 비워 보내면 이전 값을 그대로 둔다. */
    public void updateStatus(LostStatus status, String storageLocation) {
        this.status = status;
        if (storageLocation != null) {
            this.storageLocation = storageLocation;
        }
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getStadiumName() {
        return stadiumName;
    }

    public String getSpecificLocation() {
        return specificLocation;
    }

    public String getCategory() {
        return category;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getStorageLocation() {
        return storageLocation;
    }

    public LostStatus getStatus() {
        return status;
    }

    public LocalDateTime getLostOrFoundDate() {
        return lostOrFoundDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
