package com.ballpark.ticketing.admin;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 첫 관리자 계정. 아이디와 비밀번호가 모두 설정되어 있고 같은 아이디의 계정이 없을 때만 서버 시작 시 만든다.
 * 이후 관리자는 관리자 화면에서 회원의 권한을 바꿔 추가한다.
 */
@ConfigurationProperties(prefix = "ticketing.admin")
public record AdminProperties(String username, String password, String email, String name) {
}
