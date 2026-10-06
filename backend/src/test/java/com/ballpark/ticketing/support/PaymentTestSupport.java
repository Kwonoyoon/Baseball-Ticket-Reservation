package com.ballpark.ticketing.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

/**
 * 예매 결제 2단계를 테스트에서 한 번에 거친다.
 * 결제 대기 예매 응답으로 가짜 PG 결제창에서 승인을 받고, 그 결제로 예매를 확정한다.
 */
public final class PaymentTestSupport {

    private PaymentTestSupport() {
    }

    /** 결제 대기 예매를 결제창에서 승인하고 확정한다. 확정된 예매 응답 본문을 돌려준다. */
    public static String payAndConfirm(MockMvc mockMvc, String token, String pendingBody) throws Exception {
        return confirm(mockMvc, token, pendingBody)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    /** 결제창 승인 뒤 확정 요청까지 보내고 결과를 돌려준다. */
    public static ResultActions confirm(MockMvc mockMvc, String token, String pendingBody) throws Exception {
        String orderId = JsonPath.read(pendingBody, "$.reservationNumber");
        int amount = JsonPath.read(pendingBody, "$.totalPrice");
        String paymentKey = checkout(mockMvc, token, orderId, amount);
        return confirm(mockMvc, token, paymentKey, orderId, amount);
    }

    /** 가짜 PG 결제창에서 승인을 받아 결제 키를 돌려준다. */
    public static String checkout(MockMvc mockMvc, String token, String orderId, int amount) throws Exception {
        String body = mockMvc.perform(post("/api/mock-pg/checkout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderId\":\"" + orderId + "\",\"orderName\":\"테스트 주문\",\"amount\":" + amount
                                + ",\"method\":\"CARD\",\"cardCompany\":\"테스트카드\",\"installmentMonths\":0,"
                                + "\"testOutcome\":\"APPROVE\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.paymentKey");
    }

    public static ResultActions confirm(MockMvc mockMvc, String token, String paymentKey, String orderId, int amount)
            throws Exception {
        return mockMvc.perform(post("/api/reservations/confirm")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentKey\":\"" + paymentKey + "\",\"orderId\":\"" + orderId + "\",\"amount\":" + amount
                        + "}"));
    }
}
