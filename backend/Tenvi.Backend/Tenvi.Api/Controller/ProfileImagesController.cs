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
        try
        {
            return _store.DeleteImage(id) ? NoContent() : NotFound();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete profile image.");
        }
    }

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
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
