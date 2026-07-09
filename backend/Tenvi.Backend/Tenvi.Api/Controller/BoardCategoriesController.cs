using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Board;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/board/categories")]
public class BoardCategoriesController : ControllerBase
{
    private const string DefaultCategoryId = "general";

    private readonly BoardSqliteStore _store;
    private readonly ILogger<BoardCategoriesController> _logger;

    public BoardCategoriesController(BoardSqliteStore store, ILogger<BoardCategoriesController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
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
    public ActionResult<BoardCategoryResponse> CreateCategory([FromBody] BoardCategoryRequest? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        var requestedId = request.Id?.Trim();

        try
        {
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
    public ActionResult<BoardCategoryResponse> UpdateCategory(string id, [FromBody] BoardCategoryRequest? request)
    {
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
    public IActionResult DeleteCategory(string id)
    {
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

    private static BoardCategoryResponse ToResponse(BoardCategory category) => new()
    {
        Id = category.Id,
        Name = category.Name,
        IsDefault = category.IsDefault,
        CreatedAt = category.CreatedAt,
        UpdatedAt = category.UpdatedAt
    };

    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
