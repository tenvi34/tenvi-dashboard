namespace Tenvi.Api.Models.Profile;

public class ProfileImageRequest
{
    public string? Id { get; set; }

    public string? DataUrl { get; set; }

    public string? Name { get; set; }

    public string? Type { get; set; }

    public DateTimeOffset? CreatedAt { get; set; }
}
