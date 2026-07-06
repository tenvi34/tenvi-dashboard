namespace Tenvi.Api.Models.Board;

// 게시글 생성 요청 본문 계약
public class CreateBoardPostRequest
{
    // LOCAL -> REMOTE 복사 시 기존 식별자와 작성 시각 보존
    public string? Id { get; set; }

    // 서버에서 필수값으로 검증하는 제목
    public string Title { get; set; } = string.Empty;

    // 선택 입력 가능한 본문
    public string Content { get; set; } = string.Empty;

    public List<BoardBlock>? Blocks { get; set; }

    public string Author { get; set; } = "TENVI";

    // 선택 입력 가능한 카테고리 식별자
    public string CategoryId { get; set; } = string.Empty;

    // 생성 시 목록 상단 고정 여부
    public bool IsPinned { get; set; }

    public bool? Pinned { get; set; }

    public int? Views { get; set; }

    public int? ViewCount { get; set; }

    public DateTimeOffset? CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }
}
