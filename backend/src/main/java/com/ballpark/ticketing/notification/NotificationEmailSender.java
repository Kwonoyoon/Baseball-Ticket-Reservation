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

    @Async
    public void sendWaitMail(Long memberId, NotificationType type, WaitEmailContent content) {
        memberRepository.findById(memberId).ifPresent(member -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
                helper.setTo(member.getEmail());
                helper.setSubject("[SAFE TICKET] %s vs %s 양도 대기 안내".formatted(content.awayTeamName(),
                        content.homeTeamName()));
                helper.setText(waitBody(type, content), true);
                mailSender.send(message);
            } catch (Exception e) {
                log.warn("이메일 알림을 보내지 못했습니다. memberId={}", memberId, e);
            }
        });
    }

    private String waitBody(NotificationType type, WaitEmailContent content) {
        String headline = switch (type) {
            case TRANSFER_WAIT_CANCELED -> "양도 대기가 취소되었습니다";
            case TRANSFER_WAIT_POSITION -> content.position() == 1
                    ? "대기 1번째가 되었습니다"
                    : "대기 순번이 %d번째로 바뀌었습니다".formatted(content.position());
            default -> "양도 대기가 등록되었습니다";
        };
        String positionRow = type == NotificationType.TRANSFER_WAIT_CANCELED ? "" : """
                    <tr><td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap;">내 순번</td>
                        <td style="padding: 6px 0; font-weight: bold;">%d번째</td></tr>
                """.formatted(content.position());
        String footer = switch (type) {
            case TRANSFER_WAIT_CANCELED -> "이 경기의 양도글을 먼저 살 수 있는 순서에서 빠졌습니다. 필요하면 다시 대기할 수 있습니다.";
            case TRANSFER_WAIT_POSITION -> "앞선 대기자가 빠져 순번이 당겨졌습니다. 양도글이 올라오면 줄 선 순서대로 먼저 살 수 있습니다.";
            default -> "양도글이 올라오면 줄 선 순서대로 먼저 살 수 있습니다. 앞의 3명에게 우선 구매 시간이 주어집니다.";
        };
        return """
                <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
                  <h2 style="margin-bottom: 4px;">%s</h2>
                  <table style="width: 100%%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap;">경기</td>
                        <td style="padding: 6px 0;">%s vs %s</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap;">일시</td>
                        <td style="padding: 6px 0;">%s</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap;">구장</td>
                        <td style="padding: 6px 0;">%s</td></tr>
                %s  </table>
                  <p><a href="%s" style="display: inline-block; padding: 10px 16px; background: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px;">양도 마켓 보기</a></p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                  <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
                    %s
                  </p>
                </div>
                """.formatted(
                headline,
                content.awayTeamName(), content.homeTeamName(),
                content.gameStartAt().format(GAME_DATE_TIME),
                content.stadiumName(),
                positionRow,
                mailProperties.appBaseUrl() + "/transfers",
                footer);
    }

    private String subject(NotificationType type, ReservationEmailContent content) {
        String verb = switch (type) {
            case RESERVATION_CANCELED -> "취소";
            case GAME_CANCELED -> "경기 취소로 인한 자동 취소";
            case TRANSFER_REGISTERED -> "양도 등록";
            case TRANSFER_CANCELED -> "양도 취소";
            case TRANSFER_BOUGHT -> "양도 구매";
            case TRANSFER_SOLD -> "양도 판매";
            default -> "완료";
        };
        return "[SAFE TICKET] %s vs %s 예매 %s 안내".formatted(content.awayTeamName(), content.homeTeamName(), verb);
    }

    private String body(NotificationType type, ReservationEmailContent content) throws MessagingException {
        String seatRows = content.seatLabels().stream()
                .map(label -> "<li>" + label + "</li>")
                .collect(Collectors.joining());
        // 판매자는 팔린 예매의 주인이 아니라서 그 예매 상세는 볼 수 없다. 예매내역 목록으로 보낸다.
        String detailUrl = type == NotificationType.TRANSFER_SOLD
                ? mailProperties.appBaseUrl() + "/my/reservations"
                : mailProperties.appBaseUrl() + "/reservations/" + content.reservationId();
        String headline = switch (type) {
            case RESERVATION_CANCELED -> "예매가 취소되었습니다";
            case GAME_CANCELED -> "경기 취소로 예매가 자동 취소되었습니다";
            case TRANSFER_REGISTERED -> "예매가 양도 마켓에 등록되었습니다";
            case TRANSFER_CANCELED -> "예매가 양도 마켓에서 취소되었습니다";
            case TRANSFER_BOUGHT -> "양도 티켓을 구매했습니다";
            case TRANSFER_SOLD -> "양도 티켓이 팔렸습니다";
            default -> "예매가 완료되었습니다";
        };
        String footer = switch (type) {
            case GAME_CANCELED -> "경기가 우천 등의 사유로 취소되어 결제하신 금액은 결제했던 수단으로 환불 처리가 될 예정입니다";
            case TRANSFER_REGISTERED -> """
                    양도가 완료되면 결제하신 금액이 환불됩니다.<br>
                    등록 중에는 이 예매를 취소할 수 없고, 티켓 양도 마켓에서 글을 거둘 수 있습니다.""";
            case TRANSFER_CANCELED -> """
                    양도 등록이 취소되어 예매는 그대로 유지됩니다.<br>
                    경기 시작 전까지 예매내역에서 예매를 취소하거나 다시 양도 등록할 수 있습니다.""";
            case TRANSFER_BOUGHT -> """
                    구매한 티켓은 예매내역에서 확인할 수 있습니다.<br>
                    경기 당일 예매번호를 매표소 또는 입장 게이트에서 확인해 주세요.""";
            case TRANSFER_SOLD -> """
                    양도가 완료되어 결제하신 금액은 결제했던 수단으로 환불됩니다.<br>
                    이 예매는 더 이상 내 예매내역에 남지 않습니다.""";
            default -> """
                    경기 당일 예매번호를 매표소 또는 입장 게이트에서 확인해 주세요.<br>
                    경기 시작 전까지 예매내역에서 예매를 취소할 수 있습니다.""";
        };

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
                    %s
                  </p>
                </div>
                """.formatted(
                headline,
                content.reservationNumber(),
                content.awayTeamName(), content.homeTeamName(),
                content.gameStartAt().format(GAME_DATE_TIME),
                content.stadiumName(),
                seatRows,
                formatPrice(content.totalPrice()),
                detailUrl,
                footer);
    }

    private static String formatPrice(int price) {
        return "%,d원".formatted(price);
    }
}
