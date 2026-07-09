namespace Tenvi.Api.Models.Board;

public class BoardImageRequest
{
    public string? Id { get; set; }
    public string? DataUrl { get; set; }
    public string? Name { get; set; }
    public string? Type { get; set; }
    public long? Size { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
}
