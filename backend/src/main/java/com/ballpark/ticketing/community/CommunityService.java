package com.ballpark.ticketing.community;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.community.dto.CommentCreateRequest;
import com.ballpark.ticketing.community.dto.CommentResponse;
import com.ballpark.ticketing.community.dto.LikeResponse;
import com.ballpark.ticketing.community.dto.PostCreateRequest;
import com.ballpark.ticketing.community.dto.PostDetailResponse;
import com.ballpark.ticketing.community.dto.PostPageResponse;
import com.ballpark.ticketing.community.dto.PostSummaryResponse;
import com.ballpark.ticketing.community.dto.ReportRequest;
import com.ballpark.ticketing.community.dto.TeamPostCountResponse;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRepository;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;

/**
 * 구단별 커뮤니티: 글, 댓글, 좋아요, 신고.
 * 글·댓글 조회는 비회원도 할 수 있지만(viewerId가 null일 수 있다), 쓰기는 전부 로그인이 필요하다(컨트롤러가 막는다).
 */
@Service
@Transactional(readOnly = true)
public class CommunityService {

    private final CommunityPostRepository postRepository;
    private final CommunityCommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommunityReportRepository reportRepository;
    private final TeamRepository teamRepository;
    private final MemberRepository memberRepository;
    private final Clock clock;

    public CommunityService(CommunityPostRepository postRepository, CommunityCommentRepository commentRepository,
            PostLikeRepository postLikeRepository, CommunityReportRepository reportRepository,
            TeamRepository teamRepository, MemberRepository memberRepository, Clock clock) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postLikeRepository = postLikeRepository;
        this.reportRepository = reportRepository;
        this.teamRepository = teamRepository;
        this.memberRepository = memberRepository;
        this.clock = clock;
    }

    /** 커뮤니티 입구 화면에서 구단마다 "게시글 N개"를 보여 주려고 쓴다. */
    public List<TeamPostCountResponse> getTeamPostCounts() {
        return postRepository.countAllByTeam().stream()
                .map(row -> new TeamPostCountResponse(row.getTeamId(), row.getPostCount()))
                .toList();
    }

    /** category가 null이면 모든 분류를 섞어서, keyword가 비어 있으면 검색 없이 보여 준다. */
    public PostPageResponse listPosts(Long teamId, PostCategory category, String keyword, int page, int size) {
        // hasMore 판단을 위해 한 개 더 가져와서 잘라낸다.
        List<CommunityPost> posts = postRepository.findByTeamId(teamId, category, likePattern(keyword),
                PageRequest.of(page, size + 1));
        boolean hasMore = posts.size() > size;
        List<PostSummaryResponse> items = posts.stream().limit(size).map(PostSummaryResponse::from).toList();
        return new PostPageResponse(items, hasMore);
    }

    /**
     * 제목·본문 부분 일치용 LIKE 패턴. 사용자가 친 %, _ 는 와일드카드가 아니라 글자 그대로 찾아야 해서
     * 이스케이프 문자(!)를 앞에 붙인다. (저장소 쿼리의 escape '!' 와 짝이다)
     */
    private static String likePattern(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String escaped = keyword.strip().toLowerCase()
                .replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return "%" + escaped + "%";
    }

    @Transactional
    public PostDetailResponse getPost(Long postId, Long viewerId) {
        CommunityPost post = getPostOrThrow(postId);
        post.increaseViewCount();
        return toDetail(post, viewerId);
    }

    @Transactional
    public PostDetailResponse createPost(Long teamId, Long memberId, PostCreateRequest request) {
        Team team = teamRepository.findById(teamId).orElseThrow(() -> new BusinessException(ErrorCode.TEAM_NOT_FOUND));
        Member member = getMemberOrThrow(memberId);
        CommunityPost post = new CommunityPost(team, member, request.categoryOrDefault(), request.title().trim(),
                request.content().trim(), LocalDateTime.now(clock));
        postRepository.save(post);
        return toDetail(post, memberId);
    }

    @Transactional
    public PostDetailResponse updatePost(Long postId, Long memberId, PostCreateRequest request) {
        CommunityPost post = getPostOrThrow(postId);
        requireAuthor(post, memberId);
        post.edit(request.categoryOrDefault(), request.title().trim(), request.content().trim(), LocalDateTime.now(clock));
        return toDetail(post, memberId);
    }

    @Transactional
    public void deletePost(Long postId, Long memberId) {
        CommunityPost post = getPostOrThrow(postId);
        requireAuthor(post, memberId);
        postRepository.delete(post);
    }

    /** 관리자 강제 삭제. 작성자 확인을 하지 않는다. */
    @Transactional
    public void deletePostAsAdmin(Long postId) {
        postRepository.delete(getPostOrThrow(postId));
    }

    public List<CommentResponse> listComments(Long postId, Long viewerId) {
        if (!postRepository.existsById(postId)) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        return commentRepository.findByPostId(postId).stream()
                .map(comment -> CommentResponse.of(comment, viewerId != null && comment.isAuthor(viewerId)))
                .toList();
    }

    @Transactional
    public CommentResponse createComment(Long postId, Long memberId, CommentCreateRequest request) {
        CommunityPost post = getPostOrThrow(postId);
        Member member = getMemberOrThrow(memberId);
        CommunityComment comment = new CommunityComment(post, member, request.content().trim(),
                LocalDateTime.now(clock));
        commentRepository.save(comment);
        post.increaseCommentCount();
        return CommentResponse.of(comment, true);
    }

    @Transactional
    public void deleteComment(Long commentId, Long memberId) {
        CommunityComment comment = getCommentOrThrow(commentId);
        requireAuthor(comment, memberId);
        comment.getPost().decreaseCommentCount();
        commentRepository.delete(comment);
    }

    /** 관리자 강제 삭제. */
    @Transactional
    public void deleteCommentAsAdmin(Long commentId) {
        CommunityComment comment = getCommentOrThrow(commentId);
        comment.getPost().decreaseCommentCount();
        commentRepository.delete(comment);
    }

    @Transactional
    public LikeResponse toggleLike(Long postId, Long memberId) {
        CommunityPost post = getPostOrThrow(postId);
        Member member = getMemberOrThrow(memberId);
        return postLikeRepository.findByPostIdAndMemberId(postId, memberId)
                .map(like -> {
                    postLikeRepository.delete(like);
                    post.decreaseLikeCount();
                    return new LikeResponse(false, post.getLikeCount());
                })
                .orElseGet(() -> {
                    postLikeRepository.save(new PostLike(post, member, LocalDateTime.now(clock)));
                    post.increaseLikeCount();
                    return new LikeResponse(true, post.getLikeCount());
                });
    }

    @Transactional
    public void reportPost(Long postId, Long reporterId, ReportRequest request) {
        CommunityPost post = getPostOrThrow(postId);
        if (post.isAuthor(reporterId)) {
            throw new BusinessException(ErrorCode.CANNOT_REPORT_OWN_CONTENT);
        }
        saveReport(ReportTargetType.POST, postId, reporterId, request.reason());
    }

    @Transactional
    public void reportComment(Long commentId, Long reporterId, ReportRequest request) {
        CommunityComment comment = getCommentOrThrow(commentId);
        if (comment.isAuthor(reporterId)) {
            throw new BusinessException(ErrorCode.CANNOT_REPORT_OWN_CONTENT);
        }
        saveReport(ReportTargetType.COMMENT, commentId, reporterId, request.reason());
    }

    private void saveReport(ReportTargetType targetType, Long targetId, Long reporterId, String reason) {
        if (reportRepository.existsByTargetTypeAndTargetIdAndReporterId(targetType, targetId, reporterId)) {
            throw new BusinessException(ErrorCode.ALREADY_REPORTED);
        }
        Member reporter = getMemberOrThrow(reporterId);
        reportRepository.save(new CommunityReport(targetType, targetId, reporter, reason.trim(),
                LocalDateTime.now(clock)));
    }

    private PostDetailResponse toDetail(CommunityPost post, Long viewerId) {
        boolean liked = viewerId != null && postLikeRepository.existsByPostIdAndMemberId(post.getId(), viewerId);
        boolean mine = viewerId != null && post.isAuthor(viewerId);
        return PostDetailResponse.of(post, liked, mine);
    }

    private CommunityPost getPostOrThrow(Long postId) {
        return postRepository.findWithTeamAndMemberById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
    }

    private CommunityComment getCommentOrThrow(Long commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));
    }

    private Member getMemberOrThrow(Long memberId) {
        return memberRepository.findById(memberId).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private void requireAuthor(CommunityPost post, Long memberId) {
        if (!post.isAuthor(memberId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    private void requireAuthor(CommunityComment comment, Long memberId) {
        if (!comment.isAuthor(memberId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }
}
