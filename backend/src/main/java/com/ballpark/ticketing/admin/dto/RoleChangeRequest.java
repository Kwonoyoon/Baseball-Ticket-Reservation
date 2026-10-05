package com.ballpark.ticketing.admin.dto;

import com.ballpark.ticketing.member.MemberRole;

import jakarta.validation.constraints.NotNull;

public record RoleChangeRequest(@NotNull(message = "권한을 선택해 주세요.") MemberRole role) {
}
