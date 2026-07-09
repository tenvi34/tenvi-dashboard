using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Profile;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
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
        if (request is null)
        {
            return BadRequest(new { message = "Profile payload is required." });
        }

        try
        {
            var currentProfile = _store.GetProfile();
            var now = DateTimeOffset.UtcNow;
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
        var now = DateTimeOffset.UtcNow;

        return new UserProfile
        {
            Id = DefaultProfileId,
            Nickname = "TENVI",
            CreatedAt = now,
            UpdatedAt = now
        };
    }

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
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
