package com.ballpark.ticketing.community.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PostSummaryResponseTest {

    @Test
    void 줄바꿈과_연속_공백을_한_칸으로_합친다() {
        assertThat(PostSummaryResponse.preview("  첫 줄\n\n둘째 줄\t 셋째  ")).isEqualTo("첫 줄 둘째 줄 셋째");
    }

    @Test
    void 길면_80자에서_자르고_말줄임표를_붙인다() {
        String preview = PostSummaryResponse.preview("가".repeat(100));

        assertThat(preview).hasSize(81).endsWith("…").startsWith("가".repeat(80));
    }

    @Test
    void 짧으면_그대로_둔다() {
        assertThat(PostSummaryResponse.preview("짧은 글")).isEqualTo("짧은 글");
    }
}
