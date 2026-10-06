package com.ballpark.ticketing.mockpg;

import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.reservation.payment.PaymentMethod;

/**
 * 가짜 PG의 결제창 API. 실제 PG라면 PG 회사 화면에서 처리되는 부분이다.
 * 결제창은 가맹점이 넘겨준 주문번호·금액을 그대로 믿고 인증만 하므로, 금액 확인은 가맹점의 승인 단계에서 한다.
 */
@RestController
@RequestMapping("/api/mock-pg")
public class MockPgController {

    private final MockPgService mockPgService;

    public MockPgController(MockPgService mockPgService) {
        this.mockPgService = mockPgService;
    }

    /** 결제창에서 [결제하기]를 눌렀을 때. 성공하면 결제 키를, 실패하면 PG 오류 코드와 문구를 돌려준다. */
    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> checkout(@Valid @RequestBody CheckoutRequest request) {
        MockPgResult result = mockPgService.checkout(request.orderId(), request.orderName(), request.amount(),
                request.method(), request.cardCompany(), request.installmentMonths(), request.testOutcome());
        if (!result.success()) {
            return ResponseEntity.badRequest().body(Map.of("code", result.code(), "message", result.message()));
        }
        return ResponseEntity.ok(Map.of("paymentKey", result.paymentKey(), "orderId", request.orderId(),
                "amount", request.amount()));
    }

    public record CheckoutRequest(
            @NotBlank @Size(max = 64) String orderId,
            @NotBlank @Size(max = 100) String orderName,
            @Positive int amount,
            @NotNull PaymentMethod method,
            @Size(max = 30) String cardCompany,
            @Min(0) @Max(12) int installmentMonths,
            MockPgTestOutcome testOutcome) {
    }
}
