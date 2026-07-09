using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Calendar;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/calendar/events")]
public partial class CalendarEventsController : ControllerBase
{
    private readonly CalendarSqliteStore _store;
    private readonly ILogger<CalendarEventsController> _logger;

    public CalendarEventsController(CalendarSqliteStore store, ILogger<CalendarEventsController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    public ActionResult<IEnumerable<CalendarEventResponse>> GetEvents()
    {
        try
        {
            return Ok(_store.GetEvents().Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load calendar events.");
        }
    }

    [HttpGet("{id}")]
    public ActionResult<CalendarEventResponse> GetEvent(string id)
    {
        try
        {
            var calendarEvent = _store.GetEvent(id);

            if (calendarEvent is null || calendarEvent.DeletedAt is not null)
            {
                return NotFound();
            }

            return Ok(ToResponse(calendarEvent));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load calendar event.");
        }
    }

    [HttpPost]
    public ActionResult<CalendarEventResponse> CreateEvent([FromBody] CalendarEventRequest? request)
    {
        if (!IsValidEventRequest(request))
        {
            return BadRequest(new { message = "Title, startDate, and endDate are required." });
        }

        var requestedId = request!.Id?.Trim();

        try
        {
            if (!string.IsNullOrWhiteSpace(requestedId) && _store.GetEvent(requestedId) is not null)
            {
                return Conflict(new { message = "A calendar event with the same id already exists." });
            }

            var now = DateTimeOffset.UtcNow;
            var calendarEvent = new CalendarEventItem
            {
                Id = string.IsNullOrWhiteSpace(requestedId) ? Guid.NewGuid().ToString("N") : requestedId,
                Date = NormalizeStartDate(request),
                Title = request.Title!.Trim(),
                Memo = request.Memo?.Trim() ?? string.Empty,
                StartDate = NormalizeStartDate(request),
                EndDate = NormalizeEndDate(request),
                Color = request.Color?.Trim() ?? string.Empty,
                CreatedAt = request.CreatedAt ?? now,
                UpdatedAt = request.UpdatedAt ?? request.CreatedAt ?? now,
                DeletedAt = request.DeletedAt
            };

            if (!_store.CreateEvent(calendarEvent))
            {
                return Conflict(new { message = "A calendar event with the same id already exists." });
            }

            return CreatedAtAction(nameof(GetEvent), new { id = calendarEvent.Id }, ToResponse(calendarEvent));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to create calendar event.");
        }
    }

    [HttpPut("{id}")]
    public ActionResult<CalendarEventResponse> UpdateEvent(string id, [FromBody] CalendarEventRequest? request)
    {
        if (!IsValidEventRequest(request))
        {
            return BadRequest(new { message = "Title, startDate, and endDate are required." });
        }

        try
        {
            var calendarEvent = _store.GetEvent(id);

            if (calendarEvent is null || calendarEvent.DeletedAt is not null)
            {
                return NotFound();
            }

            calendarEvent.Date = NormalizeStartDate(request!);
            calendarEvent.Title = request!.Title!.Trim();
            calendarEvent.Memo = request.Memo?.Trim() ?? string.Empty;
            calendarEvent.StartDate = NormalizeStartDate(request);
            calendarEvent.EndDate = NormalizeEndDate(request);
            calendarEvent.Color = request.Color?.Trim() ?? string.Empty;
            calendarEvent.UpdatedAt = DateTimeOffset.UtcNow;

            if (!_store.UpdateEvent(calendarEvent))
            {
                return NotFound();
            }

            return Ok(ToResponse(calendarEvent));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to update calendar event.");
        }
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteEvent(string id)
    {
        try
        {
            var calendarEvent = _store.GetEvent(id);

            if (calendarEvent is null || calendarEvent.DeletedAt is not null)
            {
                return NotFound();
            }

            var deletedAt = DateTimeOffset.UtcNow;
            calendarEvent.DeletedAt = deletedAt;
            calendarEvent.UpdatedAt = deletedAt;

            if (!_store.UpdateEvent(calendarEvent))
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete calendar event.");
        }
    }

    private static bool IsValidEventRequest(CalendarEventRequest? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
        {
            return false;
        }

        var startDate = NormalizeStartDate(request);
        var endDate = NormalizeEndDate(request);

        return IsDateKey(startDate) && IsDateKey(endDate) && string.CompareOrdinal(endDate, startDate) >= 0;
    }

    private static string NormalizeStartDate(CalendarEventRequest request) =>
        string.IsNullOrWhiteSpace(request.StartDate)
            ? request.Date?.Trim() ?? string.Empty
            : request.StartDate.Trim();

    private static string NormalizeEndDate(CalendarEventRequest request) =>
        string.IsNullOrWhiteSpace(request.EndDate) ? NormalizeStartDate(request) : request.EndDate.Trim();

    private static bool IsDateKey(string value) => DateKeyRegex().IsMatch(value);

    private static CalendarEventResponse ToResponse(CalendarEventItem calendarEvent) => new()
    {
        Id = calendarEvent.Id,
        Date = calendarEvent.StartDate,
        Title = calendarEvent.Title,
        Memo = calendarEvent.Memo,
        StartDate = calendarEvent.StartDate,
        EndDate = calendarEvent.EndDate,
        Color = calendarEvent.Color,
        CreatedAt = calendarEvent.CreatedAt,
        UpdatedAt = calendarEvent.UpdatedAt,
        DeletedAt = calendarEvent.DeletedAt
    };

    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }

    [GeneratedRegex("^\\d{4}-\\d{2}-\\d{2}$")]
    private static partial Regex DateKeyRegex();
}
