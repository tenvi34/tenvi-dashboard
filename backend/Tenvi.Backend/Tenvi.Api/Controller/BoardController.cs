using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Board;
using Tenvi.Api.Services;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/board/posts")]
public class BoardController : ControllerBase
{
    private readonly BoardSqliteStore _store;
    private readonly ILogger<BoardController> _logger;

    public BoardController(BoardSqliteStore store, ILogger<BoardController> logger)
    {
        _store = store;
        _logger = logger;
    }

    // 게시글 목록 조회와 정렬 기준
    [HttpGet]
    public ActionResult<IEnumerable<BoardPostResponse>> GetPosts()
    {
        try
        {
            // 저장소 정렬 결과를 기존 응답 DTO로 변환
            return Ok(_store.GetPosts(includeDeleted: false)
                .Select(ToResponse)
                .ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load board posts.");
        }
    }

    // 휴지통 게시글 목록 조회
    [HttpGet("trash")]
    public ActionResult<IEnumerable<BoardPostResponse>> GetTrashPosts()
    {
        try
        {
            // 삭제 시간이 있는 글만 휴지통 목록으로 노출
            return Ok(_store.GetPosts(includeDeleted: true)
                .Select(ToResponse)
                .ToList());
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load deleted board posts.");
        }
    }

    // 게시글 상세 조회
    [HttpGet("{id}")]
    public ActionResult<BoardPostResponse> GetPost(string id)
    {
        try
        {
            var post = _store.GetPost(id);

            if (post is null)
            {
                return NotFound();
            }

            return Ok(ToResponse(post));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to load board post.");
        }
    }

    // 게시글 생성 요청 검증과 초기값 구성
    [HttpPost]
    public ActionResult<BoardPostResponse> CreatePost([FromBody] CreateBoardPostRequest? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new
            {
                message = "Title is required."
            });
        }

        var now = DateTimeOffset.UtcNow;
        var requestedId = request.Id?.Trim();

        try
        {
            // 병렬 요청에서도 같은 LOCAL id가 중복 생성되지 않도록 서버에서도 방어
            if (!string.IsNullOrWhiteSpace(requestedId) && _store.GetPost(requestedId) is not null)
            {
                return Conflict(new { message = "A board post with the same id already exists." });
            }
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to check board post id.");
        }

        // 블록 기반 본문과 이전 단일 본문 입력을 함께 수용
        var blocks = NormalizeBlocks(request.Blocks, request.Content);
        var post = new BoardPost
        {
            Id = string.IsNullOrWhiteSpace(requestedId) ? Guid.NewGuid().ToString("N") : requestedId,
            Title = request.Title.Trim(),
            Content = NormalizeContent(request.Content, blocks),
            Blocks = blocks,
            Author = NormalizeAuthor(request.Author),
            CategoryId = request.CategoryId?.Trim() ?? string.Empty,

            // 이전 필드명과 현재 필드명을 모두 허용하는 호환 처리
            IsPinned = request.Pinned ?? request.IsPinned,
            ViewCount = Math.Max(0, request.Views ?? request.ViewCount ?? 0),
            CreatedAt = request.CreatedAt ?? now,
            UpdatedAt = request.UpdatedAt ?? request.CreatedAt ?? now,
            DeletedAt = request.DeletedAt
        };

        try
        {
            // 사전 검사 뒤 들어온 동일 id 요청과의 경쟁 조건 방지
            if (!_store.CreatePost(post))
            {
                return Conflict(new { message = "A board post with the same id already exists." });
            }
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to create board post.");
        }

        return CreatedAtAction(nameof(GetPost), new { id = post.Id }, ToResponse(post));
    }

    // 게시글 수정 요청 검증과 기존 데이터 갱신
    [HttpPut("{id}")]
    public ActionResult<BoardPostResponse> UpdatePost(string id, [FromBody] UpdateBoardPostRequest? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new
            {
                message = "Title is required."
            });
        }

        try
        {
            var post = _store.GetPost(id);

            if (post is null)
            {
                return NotFound();
            }

            // 블록 목록을 먼저 정리해 본문 대표 텍스트와 함께 갱신
            var blocks = NormalizeBlocks(request.Blocks, request.Content);

            post.Title = request.Title.Trim();
            post.Content = NormalizeContent(request.Content, blocks);
            post.Blocks = blocks;
            post.Author = NormalizeAuthor(request.Author);
            post.CategoryId = request.CategoryId?.Trim() ?? string.Empty;
            post.IsPinned = request.Pinned ?? request.IsPinned;

            // 조회수는 요청에 포함된 경우에만 덮어써 기존 카운트 손실 방지
            var requestedViews = request.Views ?? request.ViewCount;

            if (requestedViews.HasValue)
            {
                post.ViewCount = Math.Max(0, requestedViews.Value);
            }

            post.UpdatedAt = DateTimeOffset.UtcNow;

            if (!_store.UpdatePost(post))
            {
                return NotFound();
            }

            return Ok(ToResponse(post));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to update board post.");
        }
    }

    // 게시글 삭제 처리
    [HttpDelete("{id}")]
    public IActionResult DeletePost(string id)
    {
        try
        {
            var post = _store.GetPost(id);

            if (post is null)
            {
                return NotFound();
            }

            var deletedAt = DateTimeOffset.UtcNow;

            // 휴지통 복원을 위해 실제 제거 대신 삭제 시간만 기록
            post.DeletedAt = deletedAt;
            post.UpdatedAt = deletedAt;

            if (!_store.UpdatePost(post))
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to delete board post.");
        }
    }

    // 조회수 증가 전용: 읽기 지표라 UpdatedAt은 변경하지 않음
    [HttpPatch("{id}/views")]
    public ActionResult<BoardPostResponse> IncreasePostViews(string id)
    {
        try
        {
            var post = _store.GetPost(id);

            // 삭제된 글의 조회수 증가는 허용하지 않음
            if (post is null || post.DeletedAt is not null)
            {
                return NotFound();
            }

            post.ViewCount += 1;

            if (!_store.UpdatePost(post))
            {
                return NotFound();
            }

            return Ok(ToResponse(post));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to increase board post views.");
        }
    }

    // 휴지통 게시글 복원 처리
    [HttpPatch("{id}/restore")]
    public ActionResult<BoardPostResponse> RestorePost(string id)
    {
        try
        {
            var post = _store.GetPost(id);

            if (post is null)
            {
                return NotFound();
            }

            // 삭제 시간을 비워 일반 게시글 목록에 다시 포함
            post.DeletedAt = null;
            post.UpdatedAt = DateTimeOffset.UtcNow;

            if (!_store.UpdatePost(post))
            {
                return NotFound();
            }

            return Ok(ToResponse(post));
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to restore board post.");
        }
    }

    // 휴지통 게시글 영구 삭제 처리
    [HttpDelete("{id}/permanent")]
    public IActionResult PermanentlyDeletePost(string id)
    {
        try
        {
            if (!_store.PermanentlyDeletePost(id))
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (Exception exception)
        {
            return HandleStorageError(exception, "Failed to permanently delete board post.");
        }
    }

    // 내부 저장 모델을 프론트엔드 응답 계약으로 변환
    // 게시글 응답 DTO 변환
    private static BoardPostResponse ToResponse(BoardPost post) => new()
    {
        Id = post.Id,
        Title = post.Title,
        Content = post.Content,
        Blocks = post.Blocks,
        Author = post.Author,
        CategoryId = post.CategoryId,
        CreatedAt = post.CreatedAt,
        UpdatedAt = post.UpdatedAt,
        Views = post.ViewCount,
        Pinned = post.IsPinned,
        DeletedAt = post.DeletedAt
    };

    // DB 장애는 콘솔 로그에 원인을 남기고, 클라이언트에는 기존 API 형태를 해치지 않는 500 응답 반환
    private ObjectResult HandleStorageError(Exception exception, string message)
    {
        _logger.LogError(exception, "{Message} DatabasePath: {DatabasePath}", message, _store.DatabasePath);

        return StatusCode(StatusCodes.Status500InternalServerError, new
        {
            message
        });
    }

    // 작성자 기본값 보정
    // 작성자 기본값 보정
    private static string NormalizeAuthor(string? author)
    {
        var normalizedAuthor = author?.Trim();

        return string.IsNullOrWhiteSpace(normalizedAuthor) ? "TENVI" : normalizedAuthor;
    }

    // 블록 입력 정규화와 이전 content 입력 호환
    // 블록 목록 정규화
    private static List<BoardBlock> NormalizeBlocks(IEnumerable<BoardBlock>? blocks, string? fallbackContent)
    {
        if (blocks is null)
        {
            var normalizedContent = fallbackContent?.Trim() ?? string.Empty;

            // 블록이 없는 이전 요청은 텍스트 블록 하나로 변환
            return string.IsNullOrWhiteSpace(normalizedContent)
                ? []
                : [CreateTextBlock(normalizedContent)];
        }

        return blocks
            .Select(NormalizeBlock)

            // 유효하지 않은 이미지 블록 등은 저장 대상에서 제외
            .Where(block => block is not null)
            .Cast<BoardBlock>()
            .ToList();
    }

    // 개별 블록 타입별 저장 형태 정리
    // 블록 단건 정규화
    private static BoardBlock? NormalizeBlock(BoardBlock? block)
    {
        if (block is null)
        {
            return null;
        }

        var type = string.IsNullOrWhiteSpace(block.Type) ? "text" : block.Type.Trim();

        if (string.Equals(type, "image", StringComparison.OrdinalIgnoreCase))
        {
            var imageId = block.ImageId?.Trim();
            var src = block.Src?.Trim();

            if (string.IsNullOrWhiteSpace(imageId) && string.IsNullOrWhiteSpace(src))
            {
                // 표시할 원본이 없는 이미지 블록은 무시
                return null;
            }

            return new BoardBlock
            {
                Id = NormalizeBlockId(block.Id),
                Type = "image",
                ImageId = string.IsNullOrWhiteSpace(imageId) ? null : imageId,
                Src = string.IsNullOrWhiteSpace(src) ? null : src,
                Name = string.IsNullOrWhiteSpace(block.Name) ? "image" : block.Name.Trim()
            };
        }

        return new BoardBlock
        {
            Id = NormalizeBlockId(block.Id),
            Type = "text",
            Content = block.Content ?? string.Empty
        };
    }

    // 단일 본문 입력을 블록 구조로 맞추는 기본 텍스트 블록
    // 텍스트 블록 생성
    private static BoardBlock CreateTextBlock(string content) => new()
    {
        Id = Guid.NewGuid().ToString("N"),
        Type = "text",
        Content = content
    };

    // 클라이언트 미전달 시 서버에서 블록 식별자 생성
    // 블록 id 보정
    private static string NormalizeBlockId(string? id) =>
        string.IsNullOrWhiteSpace(id) ? Guid.NewGuid().ToString("N") : id.Trim();

    // 텍스트 블록에서 대표 본문을 재구성
    // 대표 본문 재구성
    private static string NormalizeContent(string? requestedContent, IEnumerable<BoardBlock> blocks)
    {
        var textContent = string.Join(
            "\n\n",
            blocks
                .Where(block => string.Equals(block.Type, "text", StringComparison.OrdinalIgnoreCase))
                .Select(block => block.Content.Trim())
                .Where(content => !string.IsNullOrWhiteSpace(content)));

        if (!string.IsNullOrWhiteSpace(textContent))
        {
            return textContent;
        }

        return requestedContent?.Trim() ?? string.Empty;
    }
}
