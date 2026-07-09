using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Profile;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/profile/images")]
public class ProfileImagesController : ControllerBase
{
    private readonly ProfileSqliteStore _store;
    private readonly ILogger<ProfileImagesController> _logger;

    public ProfileImagesController(ProfileSqliteStore store, ILogger<ProfileImagesController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    public ActionResult<IEnumerable<ProfileImageResponse>> GetImages()
    {
        // 프로필 이미지 목록 조회
        try
        {
            return Ok(_store.GetImages().Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load profile images.");
        }
    }

    [HttpGet("{id}")]
    public ActionResult<ProfileImageResponse> GetImage(string id)
    {
        // 프로필 이미지 단건 조회
        try
        {
            var image = _store.GetImage(id);

            return image is null ? NotFound() : Ok(ToResponse(image));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load profile image.");
        }
    }

    [HttpPost]
    public ActionResult<ProfileImageResponse> CreateImage([FromBody] ProfileImageRequest? request)
    {
        // data URL 이미지 요청 검증
        if (
            request is null ||
            string.IsNullOrWhiteSpace(request.Id) ||
            string.IsNullOrWhiteSpace(request.DataUrl) ||
            !request.DataUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase)
        )
        {
            return BadRequest(new { message = "Image id and dataUrl are required." });
        }

        var id = request.Id.Trim();

        try
        {
            // 이미지 id 중복 방지
            if (_store.GetImage(id) is not null)
            {
                return Conflict(new { message = "A profile image with the same id already exists." });
            }

            var image = new ProfileImage
            {
                Id = id,
                DataUrl = request.DataUrl,
                Name = string.IsNullOrWhiteSpace(request.Name) ? "profile-image" : request.Name.Trim(),
                Type = request.Type ?? string.Empty,
                CreatedAt = request.CreatedAt ?? DateTimeOffset.UtcNow
            };

            if (!_store.CreateImage(image))
            {
                return Conflict(new { message = "A profile image with the same id already exists." });
            }

            return CreatedAtAction(nameof(GetImage), new { id = image.Id }, ToResponse(image));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to create profile image.");
        }
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteImage(string id)
    {
        // 프로필 이미지 삭제
        try
        {
            return _store.DeleteImage(id) ? NoContent() : NotFound();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete profile image.");
        }
    }

    // 프로필 이미지 응답 DTO 변환
    private static ProfileImageResponse ToResponse(ProfileImage image) => new()
    {
        Id = image.Id,
        DataUrl = image.DataUrl,
        Name = image.Name,
        Type = image.Type,
        CreatedAt = image.CreatedAt
    };

    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        // SQLite 오류 응답 통일
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
