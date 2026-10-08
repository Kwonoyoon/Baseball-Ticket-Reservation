package com.ballpark.ticketing.admin;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.admin.dto.AdminDashboardResponse;

/** 관리자 전용. 접근 제어는 SecurityConfig의 /api/admin/** 규칙이 맡는다. */
@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    public AdminDashboardController(AdminDashboardService adminDashboardService) {
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping
    public AdminDashboardResponse dashboard() {
        return adminDashboardService.dashboard();
    }
}
