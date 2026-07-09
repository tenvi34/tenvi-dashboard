namespace Tenvi.Api.Models.Notes;

public class NoteItemRequest
{
    public string? Id { get; set; }
    public string? Title { get; set; }
    public string? Content { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
