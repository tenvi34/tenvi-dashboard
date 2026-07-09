namespace Tenvi.Api.Models.Board;

public class BoardCategoryRequest
{
    public string? Id { get; set; }
    public string? Name { get; set; }
    public bool? IsDefault { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
