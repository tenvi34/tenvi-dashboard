namespace Tenvi.Api.Models.Profile;

public class UserProfile
{
    public string Id { get; set; } = "local-user";

    public string Nickname { get; set; } = "TENVI";

    public string Bio { get; set; } = string.Empty;

    public string AvatarImageId { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
