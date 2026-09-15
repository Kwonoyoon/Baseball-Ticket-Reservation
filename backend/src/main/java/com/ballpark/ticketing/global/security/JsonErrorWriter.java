package com.ballpark.ticketing.global.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.http.MediaType;

import com.ballpark.ticketing.global.error.ErrorCode;

import jakarta.servlet.http.HttpServletResponse;

/**
 * 컨트롤러에 도달하기 전 보안 필터 단계에서 발생한 오류를 API 오류 형식으로 응답한다.
 */
final class JsonErrorWriter {

    private JsonErrorWriter() {
    }

    static void write(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.getStatus().value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"code\":\"" + errorCode.name() + "\",\"message\":\"" + errorCode.getMessage() + "\"}");
    }
}
