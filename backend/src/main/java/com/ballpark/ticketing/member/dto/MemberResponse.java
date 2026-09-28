package com.ballpark.ticketing.member.dto;

import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRole;

public record MemberResponse(Long id, String username, String email, String name, MemberRole role,
        Long favoriteTeamId) {

    public static MemberResponse from(Member member) {
        return new MemberResponse(member.getId(), member.getUsername(), member.getEmail(), member.getName(),
                member.getRole(), member.getFavoriteTeamId());
    }
}
