namespace Tenvi.Api.Models.Profile;

public class UserProfileRequest
{
    public string? Id { get; set; }

    public string? Nickname { get; set; }

    public string? Bio { get; set; }

    public string? AvatarImageId { get; set; }

    public DateTimeOffset? CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}
