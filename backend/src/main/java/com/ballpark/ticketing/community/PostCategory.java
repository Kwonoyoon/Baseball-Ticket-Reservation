package com.ballpark.ticketing.community;

/** 게시판 안의 글 분류. 화면에서는 탭으로 나눠 보여 준다. */
public enum PostCategory {

    FREE("자유"),
    GAME("경기"),
    CHEER("응원"),
    TICKET_TRANSFER("티켓 양도");

    private final String label;

    PostCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
