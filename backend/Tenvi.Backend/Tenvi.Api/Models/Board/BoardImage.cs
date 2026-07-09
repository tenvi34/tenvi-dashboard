namespace Tenvi.Api.Models.Board;

public class BoardImage
{
    public string Id { get; set; } = string.Empty;
    public string DataUrl { get; set; } = string.Empty;
    public string Name { get; set; } = "image";
    public string Type { get; set; } = string.Empty;
    public long Size { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
