namespace Tenvi.Api.Models.Calendar;

public class CalendarEventRequest
{
    public string? Id { get; set; }

    public string? Date { get; set; }

    public string? Title { get; set; }

    public string? Memo { get; set; }

    public string? StartDate { get; set; }

    public string? EndDate { get; set; }

    public string? Color { get; set; }

    public DateTimeOffset? CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }
}
