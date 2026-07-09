namespace Tenvi.Api.Models.Calendar;

public class CalendarEventItem
{
    public string Id { get; set; } = string.Empty;

    public string Date { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Memo { get; set; } = string.Empty;

    public string StartDate { get; set; } = string.Empty;

    public string EndDate { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? DeletedAt { get; set; }
}
