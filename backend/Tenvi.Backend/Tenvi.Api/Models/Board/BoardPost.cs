namespace Tenvi.Api.Models.Board;

// 게시판 글 응답 모델
public class BoardPost
{
    // 게시글 고유 식별자
    public string Id { get; set; } = string.Empty;

    // 목록과 상세 화면에 표시되는 제목
    public string Title { get; set; } = string.Empty;

    // 상세 화면 본문
    public string Content { get; set; } = string.Empty;

    // 프론트엔드 분류 필터와 연결되는 카테고리 값
    public string CategoryId { get; set; } = string.Empty;

    // 목록 정렬에서 상단 고정 여부
    public bool IsPinned { get; set; }

    // 상세 조회 누적 카운트
    public int ViewCount { get; set; }

    // 최초 생성 시각
    public DateTimeOffset CreatedAt { get; set; }

    // 마지막 수정 시각
    public DateTimeOffset UpdatedAt { get; set; }
}
