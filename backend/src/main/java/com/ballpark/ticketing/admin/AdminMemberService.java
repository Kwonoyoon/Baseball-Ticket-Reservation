package com.ballpark.ticketing.admin;

import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.admin.dto.AdminMemberResponse;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRepository;
import com.ballpark.ticketing.member.MemberRole;
import com.ballpark.ticketing.member.MemberStatus;
import com.ballpark.ticketing.member.RefreshTokenService;

/**
 * 관리자 회원 관리. 본인 계정은 잠그거나 권한을 바꿀 수 없다. (마지막 관리자가 스스로 권한을 잃는 일을 막는다)
 * 권한과 잠금은 다음 요청부터 바로 반영된다. (요청마다 DB에서 계정 상태를 확인한다)
 */
@Service
@Transactional(readOnly = true)
public class AdminMemberService {

    private final MemberRepository memberRepository;
    private final RefreshTokenService refreshTokenService;

    public AdminMemberService(MemberRepository memberRepository, RefreshTokenService refreshTokenService) {
        this.memberRepository = memberRepository;
        this.refreshTokenService = refreshTokenService;
    }

    public List<AdminMemberResponse> search(String keyword) {
        String normalized = keyword == null || keyword.isBlank() ? null : keyword.trim().toLowerCase(Locale.ROOT);
        return memberRepository.search(normalized).stream().map(AdminMemberResponse::from).toList();
    }

    /** 잠그면 그 회원의 모든 로그인이 끊긴다. */
    @Transactional
    public AdminMemberResponse lock(Long adminId, Long memberId) {
        Member member = getModifiableMember(adminId, memberId);
        member.lock();
        refreshTokenService.revokeAll(memberId);
        return AdminMemberResponse.from(member);
    }

    /** 잠금을 풀면 로그인 실패 횟수도 초기화된다. */
    @Transactional
    public AdminMemberResponse unlock(Long adminId, Long memberId) {
        Member member = getModifiableMember(adminId, memberId);
        member.unlock();
        return AdminMemberResponse.from(member);
    }

    @Transactional
    public AdminMemberResponse changeRole(Long adminId, Long memberId, MemberRole role) {
        Member member = getModifiableMember(adminId, memberId);
        member.changeRole(role);
        return AdminMemberResponse.from(member);
    }

    private Member getModifiableMember(Long adminId, Long memberId) {
        if (adminId.equals(memberId)) {
            throw new BusinessException(ErrorCode.CANNOT_MODIFY_SELF);
        }
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
        if (member.getStatus() == MemberStatus.WITHDRAWN) {
            throw new BusinessException(ErrorCode.MEMBER_WITHDRAWN);
        }
        return member;
    }
}
