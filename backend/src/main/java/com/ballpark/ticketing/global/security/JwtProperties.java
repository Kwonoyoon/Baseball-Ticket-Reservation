package com.ballpark.ticketing.global.security;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ticketing.jwt")
public record JwtProperties(String secret, Duration accessTokenValidity) {
}
