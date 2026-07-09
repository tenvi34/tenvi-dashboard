namespace Tenvi.Api.Models.Map;

public class MapRecordRequest
{
    public string? Id { get; set; }
    public string? Title { get; set; }
    public string? Memo { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? LocationSource { get; set; }
    public string? CollectionId { get; set; }
    public string? OriginalFileName { get; set; }
    public string? FileType { get; set; }
    public string? TakenAt { get; set; }
    public string? PreviewDataUrl { get; set; }
    public int? PreviewImageHeight { get; set; }
    public string? PreviewImageMimeType { get; set; }
    public int? PreviewImageWidth { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
