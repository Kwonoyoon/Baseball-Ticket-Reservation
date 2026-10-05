package com.ballpark.ticketing.global.security;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRepository;

/**
 * 서명이 올바른 액세스 토큰이라도 계정의 현재 상태를 확인한 뒤에만 인증한다.
 * <ul>
 *   <li>잠기거나 탈퇴한 계정 → 거부</li>
 *   <li>비밀번호 변경 전에 발급된 토큰 → 거부 (토큰에 담긴 비밀번호 변경 시각이 계정 값과 달라진다)</li>
 *   <li>권한은 DB 값을 쓴다 → 관리자가 권한을 바꾸면 다음 요청부터 반영</li>
 * </ul>
 * 요청마다 기본키 조회 한 번이 추가되지만, 캐시를 두지 않아 잠금이 즉시 적용된다.
 */
@Component
public class AccessTokenAuthenticator {

    private final JwtTokenProvider tokenProvider;
    private final MemberRepository memberRepository;

    public AccessTokenAuthenticator(JwtTokenProvider tokenProvider, MemberRepository memberRepository) {
        this.tokenProvider = tokenProvider;
        this.memberRepository = memberRepository;
    }

    public Optional<AuthMember> authenticate(String accessToken) {
        return tokenProvider.parse(accessToken)
                .flatMap(claims -> memberRepository.findById(claims.memberId())
                        .filter(Member::isActive)
                        .filter(member -> member.passwordChangedAtInstant().equals(claims.passwordChangedAt()))
                        .map(member -> new AuthMember(member.getId(), member.getUsername(), member.getRole())));
    }
}
