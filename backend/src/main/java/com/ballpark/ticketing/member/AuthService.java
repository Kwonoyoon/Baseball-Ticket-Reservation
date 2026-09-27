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
import com.ballpark.ticketing.member.dto.LoginRequest;
import com.ballpark.ticketing.member.dto.LoginResponse;
import com.ballpark.ticketing.member.dto.MemberResponse;
import com.ballpark.ticketing.member.dto.SignupRequest;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final Clock clock;

    public AuthService(MemberRepository memberRepository, PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider, Clock clock) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.clock = clock;
    }

    @Transactional
    public MemberResponse signup(SignupRequest request) {
        String username = normalize(request.username());
        String email = normalize(request.email());
        if (memberRepository.existsByUsername(username)) {
            throw new BusinessException(ErrorCode.DUPLICATE_USERNAME);
        }
        if (memberRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }
        Member member = new Member(username, email, passwordEncoder.encode(request.password()), request.name().trim(),
                LocalDateTime.now(clock));
        try {
            memberRepository.saveAndFlush(member);
        } catch (DataIntegrityViolationException e) {
            // 동시에 같은 아이디나 이메일로 가입한 경우 유니크 제약에서 걸러진다.
            throw new BusinessException(isUsernameConflict(e) ? ErrorCode.DUPLICATE_USERNAME : ErrorCode.DUPLICATE_EMAIL);
        }
        return MemberResponse.from(member);
    }

    public LoginResponse login(LoginRequest request) {
        Member member = memberRepository.findByUsername(normalize(request.username()))
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

    /** 아이디와 이메일은 대소문자를 구분하지 않는다. */
    private static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isUsernameConflict(DataIntegrityViolationException e) {
        String message = e.getMostSpecificCause().getMessage();
        return message != null && message.toLowerCase(Locale.ROOT).contains("uk_members_username");
    }
}
