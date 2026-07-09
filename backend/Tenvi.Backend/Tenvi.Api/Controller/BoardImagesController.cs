using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Board;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/board/images")]
public class BoardImagesController : ControllerBase
{
    private readonly BoardSqliteStore _store;
    private readonly ILogger<BoardImagesController> _logger;

    public BoardImagesController(BoardSqliteStore store, ILogger<BoardImagesController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    // Board 이미지 목록 조회
    public ActionResult<IEnumerable<BoardImageResponse>> GetImages()
    {
        try
        {
            return Ok(_store.GetImages().Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load board images.");
        }
    }

    [HttpGet("{id}")]
    // Board 이미지 단건 조회
    public ActionResult<BoardImageResponse> GetImage(string id)
    {
        try
        {
            var image = _store.GetImage(id);

            return image is null ? NotFound() : Ok(ToResponse(image));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load board image.");
        }
    }

    [HttpPost]
    // Board 이미지 생성 처리
    public ActionResult<BoardImageResponse> CreateImage([FromBody] BoardImageRequest? request)
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
                return Conflict(new { message = "A board image with the same id already exists." });
            }

            var image = new BoardImage
            {
                Id = id,
                DataUrl = request.DataUrl,
                Name = string.IsNullOrWhiteSpace(request.Name) ? "image" : request.Name.Trim(),
                Type = request.Type ?? string.Empty,
                Size = Math.Max(0, request.Size ?? 0),
                Width = Math.Max(0, request.Width ?? 0),
                Height = Math.Max(0, request.Height ?? 0),
                CreatedAt = request.CreatedAt ?? DateTimeOffset.UtcNow
            };

            if (!_store.CreateImage(image))
            {
                return Conflict(new { message = "A board image with the same id already exists." });
            }

            return CreatedAtAction(nameof(GetImage), new { id = image.Id }, ToResponse(image));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to create board image.");
        }
    }

    [HttpDelete("{id}")]
    // Board 이미지 삭제 처리
    public IActionResult DeleteImage(string id)
    {
        try
        {
            return _store.DeleteImage(id) ? NoContent() : NotFound();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete board image.");
        }
    }

    // Board 이미지 응답 DTO 변환
    private static BoardImageResponse ToResponse(BoardImage image) => new()
    {
        Id = image.Id,
        DataUrl = image.DataUrl,
        Name = image.Name,
        Type = image.Type,
        Size = image.Size,
        Width = image.Width,
        Height = image.Height,
        CreatedAt = image.CreatedAt
    };

    // 저장소 오류 응답 변환
    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
