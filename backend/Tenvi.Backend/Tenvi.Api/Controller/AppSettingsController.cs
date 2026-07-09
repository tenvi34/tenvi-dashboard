using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Profile;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/app-settings")]
public class AppSettingsController : ControllerBase
{
    private static readonly HashSet<string> AllowedKeys = new(StringComparer.Ordinal)
    {
        "language",
        "theme",
        "startModule",
        "hudEffect"
    };

    private readonly ProfileSqliteStore _store;
    private readonly ILogger<AppSettingsController> _logger;

    public AppSettingsController(ProfileSqliteStore store, ILogger<AppSettingsController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    public ActionResult<IEnumerable<AppSettingResponse>> GetSettings()
    {
        try
        {
            return Ok(_store.GetSettings().Where((setting) => IsAllowedKey(setting.Key)).Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load app settings.");
        }
    }

    [HttpPut]
    public ActionResult<IEnumerable<AppSettingResponse>> PutSettings([FromBody] IEnumerable<AppSettingRequest>? requests)
    {
        if (requests is null)
        {
            return BadRequest(new { message = "Settings payload is required." });
        }

        try
        {
            var now = DateTimeOffset.UtcNow;
            var savedSettings = new List<AppSetting>();

            foreach (var request in requests)
            {
                if (request is null || !IsAllowedKey(request.Key) || string.IsNullOrWhiteSpace(request.ValueJson))
                {
                    continue;
                }

                var settingKey = request.Key!.Trim();

                savedSettings.Add(_store.UpsertSetting(new AppSetting
                {
                    Key = settingKey,
                    ValueJson = request.ValueJson,
                    UpdatedAt = request.UpdatedAt ?? now
                }));
            }

            return Ok(savedSettings.Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to save app settings.");
        }
    }

    [HttpGet("{key}")]
    public ActionResult<AppSettingResponse> GetSetting(string key)
    {
        if (!IsAllowedKey(key))
        {
            return BadRequest(new { message = "This app setting key is not remote-synced." });
        }

        try
        {
            var setting = _store.GetSetting(key);

            return setting is null ? NotFound() : Ok(ToResponse(setting));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load app setting.");
        }
    }

    [HttpPut("{key}")]
    public ActionResult<AppSettingResponse> PutSetting(string key, [FromBody] AppSettingRequest? request)
    {
        if (!IsAllowedKey(key))
        {
            return BadRequest(new { message = "This app setting key is not remote-synced." });
        }

        if (request is null || string.IsNullOrWhiteSpace(request.ValueJson))
        {
            return BadRequest(new { message = "Setting valueJson is required." });
        }

        try
        {
            var setting = new AppSetting
            {
                Key = key.Trim(),
                ValueJson = request.ValueJson,
                UpdatedAt = request.UpdatedAt ?? DateTimeOffset.UtcNow
            };

            return Ok(ToResponse(_store.UpsertSetting(setting)));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to save app setting.");
        }
    }

    private static bool IsAllowedKey(string? key) =>
        !string.IsNullOrWhiteSpace(key) && AllowedKeys.Contains(key.Trim());

    private static AppSettingResponse ToResponse(AppSetting setting) => new()
    {
        Key = setting.Key,
        ValueJson = setting.ValueJson,
        UpdatedAt = setting.UpdatedAt
    };

    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
