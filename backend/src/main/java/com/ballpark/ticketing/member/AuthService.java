package com.ballpark.ticketing.member;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.global.security.AuthProperties;
import com.ballpark.ticketing.global.security.JwtTokenProvider;
import com.ballpark.ticketing.member.RefreshTokenService.IssuedRefreshToken;
import com.ballpark.ticketing.member.RefreshTokenService.Rotation;
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
    private final RefreshTokenService refreshTokenService;
    private final AuthProperties authProperties;
    private final Clock clock;
    /** 없는 아이디로 로그인할 때도 비밀번호 비교 시간을 들여, 응답 시간으로 아이디 존재 여부를 알 수 없게 한다. */
    private final String dummyPasswordHash;

    public AuthService(MemberRepository memberRepository, TeamRepository teamRepository,
            PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider, RefreshTokenService refreshTokenService,
            AuthProperties authProperties, Clock clock) {
        this.memberRepository = memberRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.refreshTokenService = refreshTokenService;
        this.authProperties = authProperties;
        this.clock = clock;
        this.dummyPasswordHash = passwordEncoder.encode("dummy-password-for-timing");
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

    /**
     * 비밀번호를 연속으로 틀리면 실패 횟수를 쌓고, 허용 횟수에 도달하면 계정을 잠근다.
     * 실패 기록은 예외를 던진 뒤에도 커밋되어야 하므로 BusinessException에는 롤백하지 않는다.
     */
    @Transactional(noRollbackFor = BusinessException.class)
    public AuthResult login(LoginRequest request) {
        Optional<Member> found = memberRepository.findByUsername(normalize(request.username()));
        if (found.isEmpty() || found.get().getStatus() == MemberStatus.WITHDRAWN) {
            passwordEncoder.matches(request.password(), dummyPasswordHash);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        Member member = found.get();
        if (member.getStatus() == MemberStatus.LOCKED) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED);
        }
        if (!passwordEncoder.matches(request.password(), member.getPassword())) {
            int maxFailures = authProperties.maxLoginFailures();
            if (member.recordLoginFailure(maxFailures)) {
                refreshTokenService.revokeAll(member.getId());
                throw new BusinessException(ErrorCode.ACCOUNT_LOCKED,
                        "비밀번호를 " + maxFailures + "회 잘못 입력해 계정이 잠겼습니다. 관리자에게 문의해 주세요.");
            }
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        member.recordLoginSuccess(LocalDateTime.now(clock));
        return issueTokens(member, Boolean.TRUE.equals(request.autoLogin()));
    }

    /** 리프레시 토큰으로 액세스 토큰을 새로 받는다. 리프레시 토큰도 새것으로 바뀐다. */
    @Transactional(noRollbackFor = BusinessException.class)
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        Rotation rotation = refreshTokenService.rotate(rawRefreshToken);
        return new AuthResult(loginResponse(rotation.member()), rotation.refreshToken());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenService.revokeFamily(rawRefreshToken);
        }
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

    /** 새 로그인(토큰 묶음)을 시작한다. 비밀번호 변경 뒤 현재 기기를 다시 로그인시킬 때도 쓴다. */
    @Transactional
    public AuthResult issueTokens(Member member, boolean persistent) {
        IssuedRefreshToken refreshToken = refreshTokenService.issue(member, persistent);
        return new AuthResult(loginResponse(member), refreshToken);
    }

    private LoginResponse loginResponse(Member member) {
        String accessToken = tokenProvider.createAccessToken(member.getId(), member.getUsername(),
                member.passwordChangedAtInstant());
        return new LoginResponse(accessToken, "Bearer", tokenProvider.getAccessTokenValidity().toSeconds(),
                MemberResponse.from(member));
    }

    /** 아이디와 이메일은 대소문자를 구분하지 않는다. */
    static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isUsernameConflict(DataIntegrityViolationException e) {
        String message = e.getMostSpecificCause().getMessage();
        return message != null && message.toLowerCase(Locale.ROOT).contains("uk_members_username");
    }

    /** 응답 본문과, 쿠키로 내려보낼 리프레시 토큰 */
    public record AuthResult(LoginResponse body, IssuedRefreshToken refreshToken) {
    }
}
