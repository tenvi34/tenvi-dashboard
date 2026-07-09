using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Tasks;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private readonly TaskSqliteStore _store;
    private readonly ILogger<TasksController> _logger;

    public TasksController(TaskSqliteStore store, ILogger<TasksController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    // Task 목록 조회
    public ActionResult<IEnumerable<TaskItemResponse>> GetTasks()
    {
        try
        {
            return Ok(_store.GetTasks().Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load tasks.");
        }
    }

    [HttpGet("{id}")]
    // Task 단건 조회
    public ActionResult<TaskItemResponse> GetTask(string id)
    {
        try
        {
            var task = _store.GetTask(id);

            if (task is null || task.DeletedAt is not null)
            {
                return NotFound();
            }

            return Ok(ToResponse(task));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load task.");
        }
    }

    [HttpPost]
    // Task 생성 처리
    public ActionResult<TaskItemResponse> CreateTask([FromBody] TaskItemRequest? request)
    {
        // 생성 요청 검증
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        var requestedId = request.Id?.Trim();

        try
        {
            // LOCAL id 복사 충돌 방지
            if (!string.IsNullOrWhiteSpace(requestedId) && _store.GetTask(requestedId) is not null)
            {
                return Conflict(new { message = "A task with the same id already exists." });
            }

            var now = DateTimeOffset.UtcNow;
            var task = new TaskItem
            {
                Id = string.IsNullOrWhiteSpace(requestedId) ? Guid.NewGuid().ToString("N") : requestedId,
                Title = request.Title.Trim(),
                DueDate = NormalizeDueDate(request.DueDate),
                Completed = request.Completed ?? false,
                CreatedAt = request.CreatedAt ?? now,
                UpdatedAt = request.UpdatedAt ?? request.CreatedAt ?? now,
                DeletedAt = request.DeletedAt
            };

            if (!_store.CreateTask(task))
            {
                return Conflict(new { message = "A task with the same id already exists." });
            }

            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, ToResponse(task));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to create task.");
        }
    }

    [HttpPut("{id}")]
    // Task 수정 처리
    public ActionResult<TaskItemResponse> UpdateTask(string id, [FromBody] TaskItemRequest? request)
    {
        // 수정 요청 검증
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        try
        {
            var task = _store.GetTask(id);

            if (task is null || task.DeletedAt is not null)
            {
                return NotFound();
            }

            task.Title = request.Title.Trim();
            task.DueDate = NormalizeDueDate(request.DueDate);
            task.Completed = request.Completed ?? task.Completed;
            task.UpdatedAt = DateTimeOffset.UtcNow;

            if (!_store.UpdateTask(task))
            {
                return NotFound();
            }

            return Ok(ToResponse(task));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to update task.");
        }
    }

    [HttpDelete("{id}")]
    // Task 삭제 처리
    public IActionResult DeleteTask(string id)
    {
        try
        {
            var task = _store.GetTask(id);

            if (task is null || task.DeletedAt is not null)
            {
                return NotFound();
            }

            var deletedAt = DateTimeOffset.UtcNow;
            task.DeletedAt = deletedAt;
            task.UpdatedAt = deletedAt;

            if (!_store.UpdateTask(task))
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete task.");
        }
    }

    // Task 응답 DTO 변환
    private static TaskItemResponse ToResponse(TaskItem task) => new()
    {
        Id = task.Id,
        Title = task.Title,
        DueDate = task.DueDate,
        Completed = task.Completed,
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt,
        DeletedAt = task.DeletedAt
    };

    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        // SQLite 오류 응답 통일
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }

    private static string NormalizeDueDate(string? dueDate)
    {
        // 날짜 key 형식 보존
        var value = dueDate?.Trim() ?? string.Empty;

        return value.Length == 10 ? value : string.Empty;
    }
}
