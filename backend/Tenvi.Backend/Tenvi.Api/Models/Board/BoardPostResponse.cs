namespace Tenvi.Api.Models.Board;

// 프론트 localStorage BoardPost 명칭에 맞춘 응답 DTO
public class BoardPostResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<BoardBlock> Blocks { get; set; } = [];
    public string Author { get; set; } = "TENVI";
    public string CategoryId { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public int Views { get; set; }
    public bool Pinned { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
