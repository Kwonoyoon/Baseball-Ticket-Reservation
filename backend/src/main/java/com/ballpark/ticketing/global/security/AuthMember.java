package com.ballpark.ticketing.global.security;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.ballpark.ticketing.member.MemberRole;

/**
 * 인증된 회원. 컨트롤러에서 {@code @AuthenticationPrincipal}로 주입받는다.
 * 권한은 토큰이 아니라 요청 시점의 DB 값이다.
 */
public record AuthMember(Long id, String username, MemberRole role) {

    public Collection<? extends GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    public boolean isAdmin() {
        return role == MemberRole.ADMIN;
    }
}
