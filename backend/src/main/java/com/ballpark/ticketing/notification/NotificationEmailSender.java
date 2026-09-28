package com.ballpark.ticketing.notification;

import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.ballpark.ticketing.member.MemberRepository;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * 예매 완료·취소 메일 발송. 회원이 '이메일 알림'을 켜둔 경우에만 보낸다.
 * SMTP 호출은 느릴 수 있어 별도 스레드(@Async)에서 실행하고, 실패해도 예매·알림 처리에는 영향을 주지 않는다.
 */
@Component
public class NotificationEmailSender {

    private static final Logger log = LoggerFactory.getLogger(NotificationEmailSender.class);
    private static final DateTimeFormatter GAME_DATE_TIME = DateTimeFormatter.ofPattern("M월 d일(E) HH:mm", Locale.KOREAN);

    private final JavaMailSender mailSender;
    private final MemberRepository memberRepository;
    private final NotificationMailProperties mailProperties;

    public NotificationEmailSender(JavaMailSender mailSender, MemberRepository memberRepository,
            NotificationMailProperties mailProperties) {
        this.mailSender = mailSender;
        this.memberRepository = memberRepository;
        this.mailProperties = mailProperties;
    }

    @Async
    public void sendReservationMail(Long memberId, NotificationType type, ReservationEmailContent content) {
        memberRepository.findById(memberId).ifPresent(member -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
                helper.setTo(member.getEmail());
                helper.setSubject(subject(type, content));
                helper.setText(body(type, content), true);
                mailSender.send(message);
            } catch (Exception e) {
                log.warn("이메일 알림을 보내지 못했습니다. memberId={}", memberId, e);
            }
        });
    }

    private String subject(NotificationType type, ReservationEmailContent content) {
        String verb = type == NotificationType.RESERVATION_CANCELED ? "취소" : "완료";
        return "[볼파크 티켓] %s vs %s 예매 %s 안내".formatted(content.awayTeamName(), content.homeTeamName(), verb);
    }

    private String body(NotificationType type, ReservationEmailContent content) throws MessagingException {
        boolean canceled = type == NotificationType.RESERVATION_CANCELED;
        String seatRows = content.seatLabels().stream()
                .map(label -> "<li>" + label + "</li>")
                .collect(Collectors.joining());
        String detailUrl = mailProperties.appBaseUrl() + "/reservations/" + content.reservationId();

        return """
                <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
                  <h2 style="margin-bottom: 4px;">%s</h2>
                  <p style="color: #6b7280; margin-top: 0;">예매번호 %s</p>
                  <table style="width: 100%%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap;">경기</td>
                        <td style="padding: 6px 0;">%s vs %s</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap;">일시</td>
                        <td style="padding: 6px 0;">%s</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap;">구장</td>
                        <td style="padding: 6px 0;">%s</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap; vertical-align: top;">좌석</td>
                        <td style="padding: 6px 0;"><ul style="margin: 0; padding-left: 18px;">%s</ul></td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap;">결제 금액</td>
                        <td style="padding: 6px 0; font-weight: bold;">%s</td></tr>
                  </table>
                  <p><a href="%s" style="display: inline-block; padding: 10px 16px; background: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px;">예매 내역 보기</a></p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                  <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
                    경기 당일 예매번호를 매표소 또는 입장 게이트에서 확인해 주세요.<br>
                    경기 시작 전까지 예매내역에서 예매를 취소할 수 있습니다.
                  </p>
                </div>
                """.formatted(
                canceled ? "예매가 취소되었습니다" : "예매가 완료되었습니다",
                content.reservationNumber(),
                content.awayTeamName(), content.homeTeamName(),
                content.gameStartAt().format(GAME_DATE_TIME),
                content.stadiumName(),
                seatRows,
                formatPrice(content.totalPrice()),
                detailUrl);
    }

    private static String formatPrice(int price) {
        return "%,d원".formatted(price);
    }
}
