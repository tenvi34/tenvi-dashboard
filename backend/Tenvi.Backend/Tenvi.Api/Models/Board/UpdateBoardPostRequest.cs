namespace Tenvi.Api.Models.Board;

// 게시글 수정 요청 본문 계약
public class UpdateBoardPostRequest
{
    // 서버에서 필수값으로 검증하는 제목
    public string Title { get; set; } = string.Empty;

    // 수정 가능한 본문
    public string Content { get; set; } = string.Empty;

    public List<BoardBlock>? Blocks { get; set; }

    public string Author { get; set; } = "TENVI";

    // 수정 가능한 카테고리 식별자
    public string CategoryId { get; set; } = string.Empty;

    // 수정 가능한 목록 상단 고정 여부
    public bool IsPinned { get; set; }

    public bool? Pinned { get; set; }

    public int? Views { get; set; }

    public int? ViewCount { get; set; }
}
