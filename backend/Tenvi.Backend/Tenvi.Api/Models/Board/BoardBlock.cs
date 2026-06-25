namespace Tenvi.Api.Models.Board;

// 프론트 Board 에디터 블록 구조와 호환
public class BoardBlock
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public string Content { get; set; } = string.Empty;
    public string? ImageId { get; set; }
    public string? Src { get; set; }
    public string Name { get; set; } = string.Empty;
}
