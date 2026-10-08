package com.ballpark.ticketing.transfer;

import java.time.LocalDateTime;

import com.ballpark.ticketing.game.Game;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** 어떤 경기의 양도글을 기다리는 사람. 먼저 등록한 사람이 우선 구매 순서가 빠르다. */
@Entity
@Table(name = "transfer_waits", uniqueConstraints = @UniqueConstraint(
        name = "uk_transfer_waits_member_game", columnNames = {"member_id", "game_id"}))
public class TransferWait {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 회원은 id만 필요해서 연관관계 없이 값으로 둔다. (SoldSeat와 같은 이유) */
    @Column(nullable = false)
    private Long memberId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id")
    private Game game;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected TransferWait() {
    }

    public TransferWait(Long memberId, Game game, LocalDateTime createdAt) {
        this.memberId = memberId;
        this.game = game;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getMemberId() {
        return memberId;
    }

    public Game getGame() {
        return game;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
