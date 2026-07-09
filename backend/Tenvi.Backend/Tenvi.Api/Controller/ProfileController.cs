using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Profile;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
    // 로컬 기본 프로필 id
    private const string DefaultProfileId = "local-user";

    private readonly ProfileSqliteStore _store;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(ProfileSqliteStore store, ILogger<ProfileController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    public ActionResult<UserProfileResponse> GetProfile()
    {
        // 저장 프로필 없을 때 기본값 응답
        try
        {
            var profile = _store.GetProfile() ?? CreateDefaultProfile();

            return Ok(ToResponse(profile));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load profile.");
        }
    }

    [HttpPut]
    public ActionResult<UserProfileResponse> PutProfile([FromBody] UserProfileRequest? request)
    {
        // 프로필 저장 payload 검증
        if (request is null)
        {
            return BadRequest(new { message = "Profile payload is required." });
        }

        try
        {
            var currentProfile = _store.GetProfile();
            var now = DateTimeOffset.UtcNow;
            // 기존 createdAt 유지
            var createdAt = request.CreatedAt ?? currentProfile?.CreatedAt ?? now;
            var profile = new UserProfile
            {
                Id = string.IsNullOrWhiteSpace(request.Id) ? currentProfile?.Id ?? DefaultProfileId : request.Id.Trim(),
                Nickname = string.IsNullOrWhiteSpace(request.Nickname) ? "TENVI" : request.Nickname.Trim(),
                Bio = request.Bio ?? string.Empty,
                AvatarImageId = request.AvatarImageId?.Trim() ?? string.Empty,
                CreatedAt = createdAt,
                UpdatedAt = request.UpdatedAt ?? now
            };

            return Ok(ToResponse(_store.UpsertProfile(profile)));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to save profile.");
        }
    }

    private static UserProfile CreateDefaultProfile()
    {
        // 첫 실행 기본 프로필
        var now = DateTimeOffset.UtcNow;

        return new UserProfile
        {
            Id = DefaultProfileId,
            Nickname = "TENVI",
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    // 프로필 응답 DTO 변환
    private static UserProfileResponse ToResponse(UserProfile profile) => new()
    {
        Id = profile.Id,
        Nickname = profile.Nickname,
        Bio = profile.Bio,
        AvatarImageId = profile.AvatarImageId,
        CreatedAt = profile.CreatedAt,
        UpdatedAt = profile.UpdatedAt
    };

    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        // SQLite 오류 응답 통일
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
