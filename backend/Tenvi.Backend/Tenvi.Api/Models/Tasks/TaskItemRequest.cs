namespace Tenvi.Api.Models.Tasks;

public class TaskItemRequest
{
    public string? Id { get; set; }
    public string? Title { get; set; }
    public string? DueDate { get; set; }
    public bool? Completed { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
