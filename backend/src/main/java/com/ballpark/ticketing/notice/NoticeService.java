package com.ballpark.ticketing.notice;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.notice.dto.NoticeRequest;
import com.ballpark.ticketing.notice.dto.NoticeResponse;

@Service
@Transactional(readOnly = true)
public class NoticeService {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 50;

    private final NoticeRepository noticeRepository;
    private final Clock clock;

    public NoticeService(NoticeRepository noticeRepository, Clock clock) {
        this.noticeRepository = noticeRepository;
        this.clock = clock;
    }

    /** scope가 null이면 두 자리의 공지를 섞어서 최신순으로 준다. size는 1~{@value #MAX_SIZE}로 맞춘다. */
    public List<NoticeResponse> list(NoticeScope scope, Integer size) {
        int limit = size == null ? DEFAULT_SIZE : Math.min(Math.max(size, 1), MAX_SIZE);
        PageRequest page = PageRequest.of(0, limit);
        List<Notice> notices = scope == null
                ? noticeRepository.findAllByOrderByIdDesc(page)
                : noticeRepository.findByScopeOrderByIdDesc(scope, page);
        return notices.stream().map(NoticeResponse::from).toList();
    }

    @Transactional
    public NoticeResponse create(Long adminId, NoticeRequest request) {
        Notice notice = new Notice(request.scope(), request.category(), request.title().strip(),
                request.content().strip(), adminId, LocalDateTime.now(clock));
        return NoticeResponse.from(noticeRepository.save(notice));
    }

    @Transactional
    public NoticeResponse update(Long noticeId, NoticeRequest request) {
        Notice notice = find(noticeId);
        notice.edit(request.scope(), request.category(), request.title().strip(), request.content().strip(),
                LocalDateTime.now(clock));
        return NoticeResponse.from(notice);
    }

    @Transactional
    public void delete(Long noticeId) {
        noticeRepository.delete(find(noticeId));
    }

    private Notice find(Long noticeId) {
        return noticeRepository.findById(noticeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTICE_NOT_FOUND));
    }
}
