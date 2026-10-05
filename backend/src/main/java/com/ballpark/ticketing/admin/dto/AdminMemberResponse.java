package com.ballpark.ticketing.admin.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRole;
import com.ballpark.ticketing.member.MemberStatus;

public record AdminMemberResponse(
        Long id,
        String username,
        String name,
        String email,
        MemberRole role,
        MemberStatus status,
        int failedLoginAttempts,
        LocalDateTime lastLoginAt,
        LocalDateTime createdAt) {

    public static AdminMemberResponse from(Member member) {
        return new AdminMemberResponse(member.getId(), member.getUsername(), member.getName(), member.getEmail(),
                member.getRole(), member.getStatus(), member.getFailedLoginAttempts(), member.getLastLoginAt(),
                member.getCreatedAt());
    }
}
