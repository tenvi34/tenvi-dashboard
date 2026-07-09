using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Map;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/map/collections")]
public class MapCollectionsController : ControllerBase
{
    private readonly MapSqliteStore _store;
    private readonly ILogger<MapCollectionsController> _logger;

    public MapCollectionsController(MapSqliteStore store, ILogger<MapCollectionsController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    // Map 컬렉션 목록 조회
    public ActionResult<IEnumerable<MapCollectionResponse>> GetCollections()
    {
        try
        {
            return Ok(_store.GetCollections().Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load map collections.");
        }
    }

    [HttpGet("{id}")]
    // Map 컬렉션 단건 조회
    public ActionResult<MapCollectionResponse> GetCollection(string id)
    {
        try
        {
            var collection = _store.GetCollection(id);

            return collection is null ? NotFound() : Ok(ToResponse(collection));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load map collection.");
        }
    }

    [HttpPost]
    // Map 컬렉션 생성 처리
    public ActionResult<MapCollectionResponse> CreateCollection([FromBody] MapCollectionRequest? request)
    {
        // 컬렉션 생성 요청 검증
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        var requestedId = request.Id?.Trim();

        try
        {
            // LOCAL id 복사 충돌 방지
            if (!string.IsNullOrWhiteSpace(requestedId) && _store.GetCollection(requestedId) is not null)
            {
                return Conflict(new { message = "A map collection with the same id already exists." });
            }

            var now = DateTimeOffset.UtcNow;
            var collection = new MapCollectionItem
            {
                Id = string.IsNullOrWhiteSpace(requestedId) ? Guid.NewGuid().ToString("N") : requestedId,
                Name = request.Name.Trim(),
                Description = request.Description ?? string.Empty,
                StartDate = request.StartDate ?? string.Empty,
                EndDate = request.EndDate ?? string.Empty,
                CreatedAt = request.CreatedAt ?? now,
                UpdatedAt = request.UpdatedAt ?? request.CreatedAt ?? now
            };

            if (!_store.CreateCollection(collection))
            {
                return Conflict(new { message = "A map collection with the same id already exists." });
            }

            return CreatedAtAction(nameof(GetCollection), new { id = collection.Id }, ToResponse(collection));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to create map collection.");
        }
    }

    [HttpPut("{id}")]
    // Map 컬렉션 수정 처리
    public ActionResult<MapCollectionResponse> UpdateCollection(string id, [FromBody] MapCollectionRequest? request)
    {
        // 컬렉션 수정 요청 검증
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        try
        {
            var collection = _store.GetCollection(id);

            if (collection is null)
            {
                return NotFound();
            }

            collection.Name = request.Name.Trim();
            collection.Description = request.Description ?? string.Empty;
            collection.StartDate = request.StartDate ?? string.Empty;
            collection.EndDate = request.EndDate ?? string.Empty;
            collection.UpdatedAt = DateTimeOffset.UtcNow;

            if (!_store.UpdateCollection(collection))
            {
                return NotFound();
            }

            return Ok(ToResponse(collection));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to update map collection.");
        }
    }

    [HttpDelete("{id}")]
    // Map 컬렉션 삭제 처리
    public IActionResult DeleteCollection(string id)
    {
        try
        {
            return _store.DeleteCollection(id) ? NoContent() : NotFound();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete map collection.");
        }
    }

    // Map 컬렉션 응답 DTO 변환
    private static MapCollectionResponse ToResponse(MapCollectionItem collection) => new()
    {
        Id = collection.Id,
        Name = collection.Name,
        Description = collection.Description,
        StartDate = collection.StartDate,
        EndDate = collection.EndDate,
        CreatedAt = collection.CreatedAt,
        UpdatedAt = collection.UpdatedAt
    };

    // 저장소 오류 응답 변환
    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
