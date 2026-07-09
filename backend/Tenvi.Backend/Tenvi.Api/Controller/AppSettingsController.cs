using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Profile;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/app-settings")]
public class AppSettingsController : ControllerBase
{
    // REMOTE 공통 설정 허용 key
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
    // 공통 설정 목록 조회
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
    // 공통 설정 목록 저장
    public ActionResult<IEnumerable<AppSettingResponse>> PutSettings([FromBody] IEnumerable<AppSettingRequest>? requests)
    {
        // 설정 목록 payload 검증
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
                // 허용되지 않은 key 제외
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
    // 공통 설정 단건 조회
    public ActionResult<AppSettingResponse> GetSetting(string key)
    {
        // 기기별 설정 key 차단
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
    // 공통 설정 단건 저장
    public ActionResult<AppSettingResponse> PutSetting(string key, [FromBody] AppSettingRequest? request)
    {
        // 기기별 설정 key 차단
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

    // REMOTE 동기화 허용 key 검증
    private static bool IsAllowedKey(string? key) =>
        !string.IsNullOrWhiteSpace(key) && AllowedKeys.Contains(key.Trim());

    // App setting 응답 DTO 변환
    private static AppSettingResponse ToResponse(AppSetting setting) => new()
    {
        Key = setting.Key,
        ValueJson = setting.ValueJson,
        UpdatedAt = setting.UpdatedAt
    };

    // 저장소 오류 응답 변환
    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
