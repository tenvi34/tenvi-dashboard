namespace Tenvi.Api.Models.Profile;

public class AppSettingResponse
{
    public string Key { get; set; } = string.Empty;

    public string ValueJson { get; set; } = "null";

    public DateTimeOffset UpdatedAt { get; set; }
}
