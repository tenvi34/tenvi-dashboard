namespace Tenvi.Api.Models.Map;

public class MapRecordItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Memo { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string LocationSource { get; set; } = "manual";
    public string? CollectionId { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public string TakenAt { get; set; } = string.Empty;
    public string PreviewDataUrl { get; set; } = string.Empty;
    public int PreviewImageHeight { get; set; }
    public string PreviewImageMimeType { get; set; } = "image/jpeg";
    public int PreviewImageWidth { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
