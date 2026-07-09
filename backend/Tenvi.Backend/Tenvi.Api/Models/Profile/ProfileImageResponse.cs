namespace Tenvi.Api.Models.Profile;

public class ProfileImageResponse
{
    public string Id { get; set; } = string.Empty;

    public string DataUrl { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}
