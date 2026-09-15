package com.ballpark.ticketing.global.security;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.ballpark.ticketing.member.MemberRole;

/**
 * JWT에서 복원한 인증 사용자. 컨트롤러에서 {@code @AuthenticationPrincipal}로 주입받는다.
 */
public record AuthMember(Long id, String email, MemberRole role) {

    public Collection<? extends GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
