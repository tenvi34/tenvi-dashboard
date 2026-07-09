namespace Tenvi.Api.Models.Profile;

public class AppSettingRequest
{
    public string? Key { get; set; }

    public string? ValueJson { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}
