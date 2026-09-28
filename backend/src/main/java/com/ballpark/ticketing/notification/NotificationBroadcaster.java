package com.ballpark.ticketing.notification;

import com.ballpark.ticketing.notification.dto.NotificationResponse;

/**
 * 새 알림을 회원의 열린 화면(SSE 연결)으로 밀어 준다.
 *
 * <p>SSE 연결은 그 연결을 받은 서버의 메모리에만 있다. 서버가 여러 대면(로컬 개발 서버와 Docker를 함께
 * 띄운 경우도 같다) 알림을 만든 서버와 회원이 연결된 서버가 다를 수 있으므로, 구현을 바꿔 끼운다.
 * <ul>
 *   <li>{@code redis}(기본): Redis Pub/Sub으로 모든 서버에 뿌리고, 각 서버가 자기 연결에 전달한다.</li>
 *   <li>{@code local}: 이 서버에 연결된 회원에게만 보낸다. Redis 없이 실행하는 테스트·로컬 프로필용.</li>
 * </ul>
 */
public interface NotificationBroadcaster {

    void broadcast(Long memberId, NotificationResponse notification);
}
