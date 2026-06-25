namespace Tenvi.Api.Models.Board;

public class UpdateBoardPostRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
}
