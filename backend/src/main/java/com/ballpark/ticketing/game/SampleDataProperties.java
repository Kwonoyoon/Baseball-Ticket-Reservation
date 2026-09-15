package com.ballpark.ticketing.game;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ticketing.sample-data")
public record SampleDataProperties(boolean enabled, int days) {
}
