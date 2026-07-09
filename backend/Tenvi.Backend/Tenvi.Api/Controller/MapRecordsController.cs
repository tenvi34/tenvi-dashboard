using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Map;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/map/records")]
public class MapRecordsController : ControllerBase
{
    private static readonly HashSet<string> LocationSources = new(StringComparer.OrdinalIgnoreCase)
    {
        "exif",
        "manual",
        "search"
    };

    private readonly MapSqliteStore _store;
    private readonly ILogger<MapRecordsController> _logger;

    public MapRecordsController(MapSqliteStore store, ILogger<MapRecordsController> logger)
    {
        _store = store;
        _logger = logger;
    }

    [HttpGet]
    public ActionResult<IEnumerable<MapRecordResponse>> GetRecords()
    {
        try
        {
            return Ok(_store.GetRecords().Select(ToResponse).ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load map records.");
        }
    }

    [HttpGet("{id}")]
    public ActionResult<MapRecordResponse> GetRecord(string id)
    {
        try
        {
            var record = _store.GetRecord(id);

            if (record is null || record.DeletedAt is not null)
            {
                return NotFound();
            }

            return Ok(ToResponse(record));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load map record.");
        }
    }

    [HttpPost]
    public ActionResult<MapRecordResponse> CreateRecord([FromBody] MapRecordRequest? request)
    {
        if (!IsValidRecordRequest(request))
        {
            return BadRequest(new { message = "Title, coordinates, and previewDataUrl are required." });
        }

        var requestedId = request!.Id?.Trim();

        try
        {
            if (!string.IsNullOrWhiteSpace(requestedId) && _store.GetRecord(requestedId) is not null)
            {
                return Conflict(new { message = "A map record with the same id already exists." });
            }

            var now = DateTimeOffset.UtcNow;
            var record = new MapRecordItem
            {
                Id = string.IsNullOrWhiteSpace(requestedId) ? Guid.NewGuid().ToString("N") : requestedId,
                Title = request.Title!.Trim(),
                Memo = request.Memo ?? string.Empty,
                Latitude = request.Latitude!.Value,
                Longitude = request.Longitude!.Value,
                LocationSource = NormalizeLocationSource(request.LocationSource),
                CollectionId = NormalizeCollectionId(request.CollectionId),
                OriginalFileName = request.OriginalFileName ?? string.Empty,
                FileType = request.FileType ?? string.Empty,
                TakenAt = request.TakenAt ?? string.Empty,
                PreviewDataUrl = request.PreviewDataUrl!,
                PreviewImageHeight = Math.Max(0, request.PreviewImageHeight ?? 0),
                PreviewImageMimeType = string.IsNullOrWhiteSpace(request.PreviewImageMimeType) ? "image/jpeg" : request.PreviewImageMimeType,
                PreviewImageWidth = Math.Max(0, request.PreviewImageWidth ?? 0),
                CreatedAt = request.CreatedAt ?? now,
                UpdatedAt = request.UpdatedAt ?? request.CreatedAt ?? now,
                DeletedAt = request.DeletedAt
            };

            if (!_store.CreateRecord(record))
            {
                return Conflict(new { message = "A map record with the same id already exists." });
            }

            return CreatedAtAction(nameof(GetRecord), new { id = record.Id }, ToResponse(record));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to create map record.");
        }
    }

    [HttpPut("{id}")]
    public ActionResult<MapRecordResponse> UpdateRecord(string id, [FromBody] MapRecordRequest? request)
    {
        if (!IsValidRecordPatch(request))
        {
            return BadRequest(new { message = "Title and coordinates are required." });
        }

        try
        {
            var record = _store.GetRecord(id);

            if (record is null || record.DeletedAt is not null)
            {
                return NotFound();
            }

            record.Title = request!.Title!.Trim();
            record.Memo = request.Memo ?? string.Empty;
            record.Latitude = request.Latitude!.Value;
            record.Longitude = request.Longitude!.Value;
            record.LocationSource = NormalizeLocationSource(request.LocationSource);
            record.CollectionId = NormalizeCollectionId(request.CollectionId);
            record.UpdatedAt = DateTimeOffset.UtcNow;

            if (!_store.UpdateRecord(record))
            {
                return NotFound();
            }

            return Ok(ToResponse(record));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to update map record.");
        }
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteRecord(string id)
    {
        try
        {
            var record = _store.GetRecord(id);

            if (record is null || record.DeletedAt is not null)
            {
                return NotFound();
            }

            var deletedAt = DateTimeOffset.UtcNow;
            record.DeletedAt = deletedAt;
            record.UpdatedAt = deletedAt;

            if (!_store.UpdateRecord(record))
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete map record.");
        }
    }

    private static bool IsValidRecordRequest(MapRecordRequest? request) =>
        IsValidRecordPatch(request) &&
        !string.IsNullOrWhiteSpace(request?.PreviewDataUrl) &&
        request.PreviewDataUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase);

    private static bool IsValidRecordPatch(MapRecordRequest? request) =>
        request is not null &&
        !string.IsNullOrWhiteSpace(request.Title) &&
        request.Latitude.HasValue &&
        request.Longitude.HasValue &&
        double.IsFinite(request.Latitude.Value) &&
        double.IsFinite(request.Longitude.Value);

    private static string NormalizeCollectionId(string? collectionId) =>
        string.IsNullOrWhiteSpace(collectionId) ? string.Empty : collectionId.Trim();

    private static string NormalizeLocationSource(string? source) =>
        !string.IsNullOrWhiteSpace(source) && LocationSources.Contains(source)
            ? source.ToLowerInvariant()
            : "manual";

    private static MapRecordResponse ToResponse(MapRecordItem record) => new()
    {
        Id = record.Id,
        Title = record.Title,
        Memo = record.Memo,
        Latitude = record.Latitude,
        Longitude = record.Longitude,
        LocationSource = record.LocationSource,
        CollectionId = string.IsNullOrWhiteSpace(record.CollectionId) ? null : record.CollectionId,
        OriginalFileName = record.OriginalFileName,
        FileType = record.FileType,
        TakenAt = record.TakenAt,
        PreviewDataUrl = record.PreviewDataUrl,
        PreviewImageHeight = record.PreviewImageHeight,
        PreviewImageMimeType = record.PreviewImageMimeType,
        PreviewImageWidth = record.PreviewImageWidth,
        CreatedAt = record.CreatedAt,
        UpdatedAt = record.UpdatedAt,
        DeletedAt = record.DeletedAt
    };

    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new { message });
    }
}
