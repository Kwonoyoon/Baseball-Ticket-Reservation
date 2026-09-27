package com.ballpark.ticketing.member.dto;

import com.ballpark.ticketing.member.Member;

public record MemberResponse(Long id, String username, String email, String name) {

    public static MemberResponse from(Member member) {
        return new MemberResponse(member.getId(), member.getUsername(), member.getEmail(), member.getName());
    }
}
