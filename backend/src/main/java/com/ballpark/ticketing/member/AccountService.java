package com.ballpark.ticketing.member;

import java.time.Clock;
import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.AuthService.AuthResult;
import com.ballpark.ticketing.member.dto.PasswordChangeRequest;
import com.ballpark.ticketing.reservation.ReservationRepository;
import com.ballpark.ticketing.reservation.ReservationStatus;

/**
 * 마이페이지: 비밀번호 변경, 회원 탈퇴.
 * 현재 비밀번호가 틀리면 401이 아니라 400으로 응답한다. (401은 프론트엔드가 로그인 만료로 처리한다)
 */
@Service
@Transactional(readOnly = true)
public class AccountService {

    private final MemberRepository memberRepository;
    private final ReservationRepository reservationRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final AuthService authService;
    private final Clock clock;

    public AccountService(MemberRepository memberRepository, ReservationRepository reservationRepository,
            PasswordEncoder passwordEncoder, RefreshTokenService refreshTokenService, AuthService authService,
            Clock clock) {
        this.memberRepository = memberRepository;
        this.reservationRepository = reservationRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
        this.authService = authService;
        this.clock = clock;
    }

    /**
     * 비밀번호를 바꾸면 모든 기기의 로그인이 끊긴다. 지금 쓰는 브라우저만 새 토큰으로 다시 로그인시킨다.
     *
     * @param currentRefreshToken 이 브라우저의 리프레시 토큰 (자동 로그인 여부를 이어받는다)
     */
    @Transactional
    public AuthResult changePassword(Long memberId, PasswordChangeRequest request, String currentRefreshToken) {
        Member member = getActiveMember(memberId);
        verifyPassword(member, request.currentPassword());
        if (passwordEncoder.matches(request.newPassword(), member.getPassword())) {
            throw new BusinessException(ErrorCode.SAME_PASSWORD);
        }
        boolean persistent = refreshTokenService.isPersistent(currentRefreshToken);

        member.changePassword(passwordEncoder.encode(request.newPassword()), LocalDateTime.now(clock));
        refreshTokenService.revokeAll(memberId);
        return authService.issueTokens(member, persistent);
    }

    /**
     * 탈퇴한 회원의 예매 이력은 남기고 이름·이메일만 지운다.
     * 관람 예정인 예매가 있으면 먼저 취소해야 하고, 관리자 계정은 탈퇴할 수 없다.
     */
    @Transactional
    public void withdraw(Long memberId, String password) {
        Member member = getActiveMember(memberId);
        if (member.getRole() == MemberRole.ADMIN) {
            throw new BusinessException(ErrorCode.ADMIN_CANNOT_WITHDRAW);
        }
        verifyPassword(member, password);
        LocalDateTime now = LocalDateTime.now(clock);
        if (reservationRepository.existsByMemberIdAndStatusAndGameStartAtAfter(memberId, ReservationStatus.CONFIRMED,
                now)) {
            throw new BusinessException(ErrorCode.HAS_UPCOMING_RESERVATIONS);
        }
        member.withdraw(now);
        refreshTokenService.revokeAll(memberId);
    }

    private Member getActiveMember(Long memberId) {
        return memberRepository.findById(memberId)
                .filter(Member::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private void verifyPassword(Member member, String password) {
        if (!passwordEncoder.matches(password, member.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CURRENT_PASSWORD);
        }
    }
}
