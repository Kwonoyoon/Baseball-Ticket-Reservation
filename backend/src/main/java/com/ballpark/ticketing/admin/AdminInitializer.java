package com.ballpark.ticketing.admin;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRepository;
import com.ballpark.ticketing.member.MemberRole;

/** 첫 관리자 계정을 만든다. 비밀번호는 로그에 남기지 않는다. */
@Component
public class AdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final AdminProperties properties;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public AdminInitializer(AdminProperties properties, MemberRepository memberRepository,
            PasswordEncoder passwordEncoder, Clock clock) {
        this.properties = properties;
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (isBlank(properties.username()) || isBlank(properties.password())) {
            log.info("ADMIN_USERNAME/ADMIN_PASSWORD가 없어 초기 관리자 계정을 만들지 않습니다.");
            return;
        }
        String username = properties.username().trim().toLowerCase(Locale.ROOT);
        if (memberRepository.existsByUsername(username)) {
            return;
        }
        if (properties.password().length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException("ADMIN_PASSWORD는 " + MIN_PASSWORD_LENGTH + "자 이상이어야 합니다.");
        }
        String email = isBlank(properties.email()) ? username + "@ballpark.local" : properties.email().trim();
        String name = isBlank(properties.name()) ? "관리자" : properties.name().trim();
        memberRepository.save(new Member(username, email.toLowerCase(Locale.ROOT),
                passwordEncoder.encode(properties.password()), name, MemberRole.ADMIN, LocalDateTime.now(clock)));
        log.info("초기 관리자 계정 '{}'을(를) 만들었습니다.", username);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
