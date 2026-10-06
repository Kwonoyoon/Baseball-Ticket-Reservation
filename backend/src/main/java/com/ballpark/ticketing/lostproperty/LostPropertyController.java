package com.ballpark.ticketing.lostproperty;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.lostproperty.dto.LostPropertyRequest;
import com.ballpark.ticketing.lostproperty.dto.LostPropertyResponse;
import com.ballpark.ticketing.lostproperty.dto.LostStatusUpdateRequest;

import jakarta.validation.Valid;

/**
 * 분실물센터 API. 모두 로그인한 회원이 쓴다. 상태 변경은 /api/admin/** 아래라 관리자만 된다.
 * (팀원 버전은 /api/v1/lost-properties 였는데, 이 프로젝트의 다른 API와 같이 /api/ 아래로 맞췄다)
 */
@RestController
public class LostPropertyController {

    private final LostPropertyService lostPropertyService;

    public LostPropertyController(LostPropertyService lostPropertyService) {
        this.lostPropertyService = lostPropertyService;
    }

    @PostMapping("/api/lost-properties")
    @ResponseStatus(HttpStatus.CREATED)
    public LostPropertyResponse create(@Valid @RequestBody LostPropertyRequest request) {
        return lostPropertyService.create(request);
    }

    @GetMapping("/api/lost-properties")
    public List<LostPropertyResponse> list(@RequestParam(required = false) String stadiumName,
            @RequestParam(required = false) LostStatus status) {
        return lostPropertyService.list(stadiumName, status);
    }

    /** {id}보다 구체적인 주소라 이쪽이 먼저 걸린다. */
    @GetMapping("/api/lost-properties/stadiums")
    public List<String> stadiums() {
        return lostPropertyService.stadiumNames();
    }

    @GetMapping("/api/lost-properties/{id}")
    public LostPropertyResponse get(@PathVariable Long id) {
        return lostPropertyService.get(id);
    }

    @PatchMapping("/api/admin/lost-properties/{id}/status")
    public LostPropertyResponse updateStatus(@PathVariable Long id, @Valid @RequestBody LostStatusUpdateRequest request) {
        return lostPropertyService.updateStatus(id, request);
    }
}
