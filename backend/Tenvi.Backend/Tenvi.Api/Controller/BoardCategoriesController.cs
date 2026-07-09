using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Board;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/board/categories")]
public class BoardCategoriesController : ControllerBase
{
    // 기본 카테고리 보호 id
    private const string DefaultCategoryId = "general";

    private readonly BoardSqliteStore _store;
    private readonly ILogger<BoardCategoriesController> _logger;

    public BoardCategoriesController(BoardSqliteStore store, ILogger<BoardCategoriesController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    // Board 카테고리 목록 조회
    public ActionResult<IEnumerable<BoardCategoryResponse>> GetCategories()
    {
        try
        {
            return Ok(_store.GetCategories().Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load board categories.");
        }
    }

    [HttpGet("{id}")]
    // Board 카테고리 단건 조회
    public ActionResult<BoardCategoryResponse> GetCategory(string id)
    {
        try
        {
            var category = _store.GetCategory(id);

            return category is null ? NotFound() : Ok(ToResponse(category));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load board category.");
        }
    }

    [HttpPost]
    // Board 카테고리 생성 처리
    public ActionResult<BoardCategoryResponse> CreateCategory([FromBody] BoardCategoryRequest? request)
    {
        // 카테고리 생성 요청 검증
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        var requestedId = request.Id?.Trim();

        try
        {
            // LOCAL id 복사 충돌 방지
            if (!string.IsNullOrWhiteSpace(requestedId) && _store.GetCategory(requestedId) is not null)
            {
                return Conflict(new { message = "A board category with the same id already exists." });
            }

            var now = DateTimeOffset.UtcNow;
            var category = new BoardCategory
            {
                Id = string.IsNullOrWhiteSpace(requestedId) ? Guid.NewGuid().ToString("N") : requestedId,
                Name = request.Name.Trim(),
                IsDefault = request.IsDefault ?? false,
                CreatedAt = request.CreatedAt ?? now,
                UpdatedAt = request.UpdatedAt ?? request.CreatedAt ?? now
            };

            if (!_store.CreateCategory(category))
            {
                return Conflict(new { message = "A board category with the same id already exists." });
            }

            return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, ToResponse(category));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to create board category.");
        }
    }

    [HttpPut("{id}")]
    // Board 카테고리 수정 처리
    public ActionResult<BoardCategoryResponse> UpdateCategory(string id, [FromBody] BoardCategoryRequest? request)
    {
        // 카테고리 수정 요청 검증
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        try
        {
            var category = _store.GetCategory(id);

            if (category is null)
            {
                return NotFound();
            }

            category.Name = request.Name.Trim();
            category.IsDefault = request.IsDefault ?? category.IsDefault;
            category.UpdatedAt = DateTimeOffset.UtcNow;

            if (!_store.UpdateCategory(category))
            {
                return NotFound();
            }

            return Ok(ToResponse(category));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to update board category.");
        }
    }

    [HttpDelete("{id}")]
    // Board 카테고리 삭제 처리
    public IActionResult DeleteCategory(string id)
    {
        // 기본 카테고리 삭제 차단
        if (id.Equals(DefaultCategoryId, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Default category cannot be deleted." });
        }

        try
        {
            return _store.DeleteCategory(id) ? NoContent() : NotFound();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete board category.");
        }
    }

    // 카테고리 응답 DTO 변환
    private static BoardCategoryResponse ToResponse(BoardCategory category) => new()
    {
        Id = category.Id,
        Name = category.Name,
        IsDefault = category.IsDefault,
        CreatedAt = category.CreatedAt,
        UpdatedAt = category.UpdatedAt
    };

    // 저장소 오류 응답 변환
    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
