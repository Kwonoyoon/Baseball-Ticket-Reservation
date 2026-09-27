package com.ballpark.ticketing.member;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.global.security.JwtTokenProvider;
import com.ballpark.ticketing.member.dto.FavoriteTeamRequest;
import com.ballpark.ticketing.member.dto.LoginRequest;
import com.ballpark.ticketing.member.dto.LoginResponse;
import com.ballpark.ticketing.member.dto.MemberResponse;
import com.ballpark.ticketing.member.dto.SignupRequest;
import com.ballpark.ticketing.team.TeamRepository;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final MemberRepository memberRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final Clock clock;

    public AuthService(MemberRepository memberRepository, TeamRepository teamRepository,
            PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider, Clock clock) {
        this.memberRepository = memberRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.clock = clock;
    }

    @Transactional
    public MemberResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (memberRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }
        Member member = new Member(email, passwordEncoder.encode(request.password()), request.name().trim(),
                LocalDateTime.now(clock));
        try {
            memberRepository.saveAndFlush(member);
        } catch (DataIntegrityViolationException e) {
            // 동시에 같은 이메일로 가입한 경우 유니크 제약에서 걸러진다.
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }
        return MemberResponse.from(member);
    }

    public LoginResponse login(LoginRequest request) {
        Member member = memberRepository.findByEmail(normalizeEmail(request.email()))
                .filter(found -> passwordEncoder.matches(request.password(), found.getPassword()))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
        String accessToken = tokenProvider.createAccessToken(member.getId(), member.getEmail(), member.getRole());
        return new LoginResponse(accessToken, "Bearer", tokenProvider.getAccessTokenValidity().toSeconds(),
                MemberResponse.from(member));
    }

    public MemberResponse getMember(Long memberId) {
        return memberRepository.findById(memberId)
                .map(MemberResponse::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    @Transactional
    public MemberResponse updateFavoriteTeam(Long memberId, FavoriteTeamRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (request.teamId() != null && !teamRepository.existsById(request.teamId())) {
            throw new BusinessException(ErrorCode.TEAM_NOT_FOUND);
        }
        member.setFavoriteTeamId(request.teamId());
        return MemberResponse.from(member);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
