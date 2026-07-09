using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Notes;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/notes")]
public class NotesController : ControllerBase
{
    private readonly NoteSqliteStore _store;
    private readonly ILogger<NotesController> _logger;

    public NotesController(NoteSqliteStore store, ILogger<NotesController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    // Note 목록 조회
    public ActionResult<IEnumerable<NoteItemResponse>> GetNotes()
    {
        try
        {
            return Ok(_store.GetNotes().Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load notes.");
        }
    }

    [HttpGet("{id}")]
    // Note 단건 조회
    public ActionResult<NoteItemResponse> GetNote(string id)
    {
        try
        {
            var note = _store.GetNote(id);

            if (note is null || note.DeletedAt is not null)
            {
                return NotFound();
            }

            return Ok(ToResponse(note));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load note.");
        }
    }

    [HttpPost]
    // Note 생성 처리
    public ActionResult<NoteItemResponse> CreateNote([FromBody] NoteItemRequest? request)
    {
        // 생성 요청 검증
        if (request is null || (string.IsNullOrWhiteSpace(request.Title) && string.IsNullOrWhiteSpace(request.Content)))
        {
            return BadRequest(new { message = "Title or content is required." });
        }

        var requestedId = request.Id?.Trim();

        try
        {
            // LOCAL id 복사 충돌 방지
            if (!string.IsNullOrWhiteSpace(requestedId) && _store.GetNote(requestedId) is not null)
            {
                return Conflict(new { message = "A note with the same id already exists." });
            }

            var now = DateTimeOffset.UtcNow;
            var note = new NoteItem
            {
                Id = string.IsNullOrWhiteSpace(requestedId) ? Guid.NewGuid().ToString("N") : requestedId,
                Title = request.Title?.Trim() ?? string.Empty,
                Content = request.Content?.Trim() ?? string.Empty,
                CreatedAt = request.CreatedAt ?? now,
                UpdatedAt = request.UpdatedAt ?? request.CreatedAt ?? now,
                DeletedAt = request.DeletedAt
            };

            if (!_store.CreateNote(note))
            {
                return Conflict(new { message = "A note with the same id already exists." });
            }

            return CreatedAtAction(nameof(GetNote), new { id = note.Id }, ToResponse(note));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to create note.");
        }
    }

    [HttpPut("{id}")]
    // Note 수정 처리
    public ActionResult<NoteItemResponse> UpdateNote(string id, [FromBody] NoteItemRequest? request)
    {
        // 수정 요청 검증
        if (request is null || (string.IsNullOrWhiteSpace(request.Title) && string.IsNullOrWhiteSpace(request.Content)))
        {
            return BadRequest(new { message = "Title or content is required." });
        }

        try
        {
            var note = _store.GetNote(id);

            if (note is null || note.DeletedAt is not null)
            {
                return NotFound();
            }

            note.Title = request.Title?.Trim() ?? string.Empty;
            note.Content = request.Content?.Trim() ?? string.Empty;
            note.UpdatedAt = DateTimeOffset.UtcNow;

            if (!_store.UpdateNote(note))
            {
                return NotFound();
            }

            return Ok(ToResponse(note));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to update note.");
        }
    }

    [HttpDelete("{id}")]
    // Note 삭제 처리
    public IActionResult DeleteNote(string id)
    {
        try
        {
            var note = _store.GetNote(id);

            if (note is null || note.DeletedAt is not null)
            {
                return NotFound();
            }

            var deletedAt = DateTimeOffset.UtcNow;
            note.DeletedAt = deletedAt;
            note.UpdatedAt = deletedAt;

            if (!_store.UpdateNote(note))
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete note.");
        }
    }

    // Note 응답 DTO 변환
    private static NoteItemResponse ToResponse(NoteItem note) => new()
    {
        Id = note.Id,
        Title = note.Title,
        Content = note.Content,
        CreatedAt = note.CreatedAt,
        UpdatedAt = note.UpdatedAt,
        DeletedAt = note.DeletedAt
    };

    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        // SQLite 오류 응답 통일
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
