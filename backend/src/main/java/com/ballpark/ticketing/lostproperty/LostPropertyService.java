package com.ballpark.ticketing.lostproperty;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.lostproperty.dto.LostPropertyRequest;
import com.ballpark.ticketing.lostproperty.dto.LostPropertyResponse;
import com.ballpark.ticketing.lostproperty.dto.LostStatusUpdateRequest;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;

/** 분실물센터. 등록·조회는 회원이 하고, 보관 상태 변경은 관리자만 한다. */
@Service
@Transactional(readOnly = true)
public class LostPropertyService {

    /** 한 번에 내려주는 최대 개수. 목록이 끝없이 길어지지 않게 막는다. */
    private static final int LIST_LIMIT = 100;

    private final LostPropertyRepository lostPropertyRepository;
    private final TeamRepository teamRepository;
    private final Clock clock;

    public LostPropertyService(LostPropertyRepository lostPropertyRepository, TeamRepository teamRepository,
            Clock clock) {
        this.lostPropertyRepository = lostPropertyRepository;
        this.teamRepository = teamRepository;
        this.clock = clock;
    }

    @Transactional
    public LostPropertyResponse create(Long reporterId, LostPropertyRequest request) {
        LostProperty property = new LostProperty(reporterId, request.title().strip(), request.description().strip(),
                request.stadiumName().strip(), blankToNull(request.specificLocation()), request.category().strip(),
                blankToNull(request.imageUrl()), request.lostOrFoundDate(), LocalDateTime.now(clock));
        return LostPropertyResponse.from(lostPropertyRepository.save(property), reporterId);
    }

    /** stadiumName·status가 null이면 그 조건 없이 모두. */
    public List<LostPropertyResponse> list(Long viewerId, String stadiumName, LostStatus status) {
        return lostPropertyRepository.search(blankToNull(stadiumName), status, PageRequest.of(0, LIST_LIMIT)).stream()
                .map(property -> LostPropertyResponse.from(property, viewerId))
                .toList();
    }

    public LostPropertyResponse get(Long viewerId, Long id) {
        return LostPropertyResponse.from(find(id), viewerId);
    }

    @Transactional
    public LostPropertyResponse updateStatus(Long viewerId, Long id, LostStatusUpdateRequest request) {
        LostProperty property = find(id);
        property.updateStatus(request.status(), blankToNull(request.storageLocation()));
        return LostPropertyResponse.from(property, viewerId);
    }

    /**
     * 분실물을 지운다. 올린 본인이나 관리자만 지울 수 있다.
     * 작성자를 모르는 예전 글(reporter_id가 null)은 관리자만 지운다.
     */
    @Transactional
    public void delete(Long requesterId, boolean admin, Long id) {
        LostProperty property = find(id);
        if (!admin && !property.isReportedBy(requesterId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        lostPropertyRepository.delete(property);
    }

    /** 등록 화면에서 고를 구장 이름. 구단이 쓰는 구장을 중복 없이 이름순으로 준다. */
    public List<String> stadiumNames() {
        return teamRepository.findAllWithStadium().stream()
                .map(Team::getStadium)
                .map(stadium -> stadium.getName())
                .distinct()
                .sorted()
                .toList();
    }

    private LostProperty find(Long id) {
        return lostPropertyRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOST_PROPERTY_NOT_FOUND));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
