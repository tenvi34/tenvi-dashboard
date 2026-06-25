using Microsoft.AspNetCore.Mvc;
using Tenvi.Api.Models.Board;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/board/posts")]
public class BoardController : ControllerBase
{
    // 게시글 임시 저장소
    private static readonly List<BoardPost> Posts = [];

    // InMemory 목록 동시 접근 보호
    private static readonly object PostsLock = new();

    // 게시글 목록 조회와 정렬 기준
    [HttpGet]
    public ActionResult<IEnumerable<BoardPostResponse>> GetPosts()
    {
        lock (PostsLock)
        {
            // 고정 게시글 우선, 최신 작성순 유지
            return Ok(SortPosts(Posts.Where(post => post.DeletedAt is null))
                .Select(ToResponse)
                .ToList());
        }
    }

    // 게시글 상세 조회
    [HttpGet("trash")]
    public ActionResult<IEnumerable<BoardPostResponse>> GetTrashPosts()
    {
        lock (PostsLock)
        {
            return Ok(SortPosts(Posts.Where(post => post.DeletedAt is not null))
                .Select(ToResponse)
                .ToList());
        }
    }

    [HttpGet("{id}")]
    public ActionResult<BoardPostResponse> GetPost(string id)
    {
        lock (PostsLock)
        {
            var post = FindPost(id);

            if (post is null)
            {
                return NotFound();
            }

            return Ok(ToResponse(post));
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
        var blocks = NormalizeBlocks(request.Blocks, request.Content);
        var post = new BoardPost
        {
            Id = Guid.NewGuid().ToString("N"),
            Title = request.Title.Trim(),
            Content = NormalizeContent(request.Content, blocks),
            Blocks = blocks,
            Author = NormalizeAuthor(request.Author),
            CategoryId = request.CategoryId?.Trim() ?? string.Empty,
            IsPinned = request.Pinned ?? request.IsPinned,
            ViewCount = Math.Max(0, request.Views ?? request.ViewCount ?? 0),
            CreatedAt = now,
            UpdatedAt = now
        };

        lock (PostsLock)
        {
            // DB 연결 전까지 프로세스 메모리에만 보관
            Posts.Add(post);
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

        lock (PostsLock)
        {
            var post = FindPost(id);

            if (post is null)
            {
                return NotFound();
            }

            // 조회수와 생성일은 유지하고 편집 가능한 값만 갱신
            var blocks = NormalizeBlocks(request.Blocks, request.Content);

            post.Title = request.Title.Trim();
            post.Content = NormalizeContent(request.Content, blocks);
            post.Blocks = blocks;
            post.Author = NormalizeAuthor(request.Author);
            post.CategoryId = request.CategoryId?.Trim() ?? string.Empty;
            post.IsPinned = request.Pinned ?? request.IsPinned;

            var requestedViews = request.Views ?? request.ViewCount;

            if (requestedViews.HasValue)
            {
                post.ViewCount = Math.Max(0, requestedViews.Value);
            }

            post.UpdatedAt = DateTimeOffset.UtcNow;

            return Ok(ToResponse(post));
        }
    }

    // 게시글 삭제 처리
    [HttpDelete("{id}")]
    public IActionResult DeletePost(string id)
    {
        lock (PostsLock)
        {
            var post = FindPost(id);

            if (post is null)
            {
                return NotFound();
            }

            var deletedAt = DateTimeOffset.UtcNow;
            post.DeletedAt = deletedAt;
            post.UpdatedAt = deletedAt;
            return NoContent();
        }
    }

    // 대소문자 차이를 허용하는 게시글 식별자 조회
    // 조회수 증가 전용: 읽기 지표라 updatedAt은 변경하지 않음
    [HttpPatch("{id}/views")]
    public ActionResult<BoardPostResponse> IncreasePostViews(string id)
    {
        lock (PostsLock)
        {
            var post = FindPost(id);

            if (post is null || post.DeletedAt is not null)
            {
                return NotFound();
            }

            post.ViewCount += 1;
            return Ok(ToResponse(post));
        }
    }

    [HttpPatch("{id}/restore")]
    public ActionResult<BoardPostResponse> RestorePost(string id)
    {
        lock (PostsLock)
        {
            var post = FindPost(id);

            if (post is null)
            {
                return NotFound();
            }

            post.DeletedAt = null;
            post.UpdatedAt = DateTimeOffset.UtcNow;

            return Ok(ToResponse(post));
        }
    }

    [HttpDelete("{id}/permanent")]
    public IActionResult PermanentlyDeletePost(string id)
    {
        lock (PostsLock)
        {
            var post = FindPost(id);

            if (post is null)
            {
                return NotFound();
            }

            Posts.Remove(post);
            return NoContent();
        }
    }

    private static BoardPost? FindPost(string id) =>
        Posts.FirstOrDefault(post => string.Equals(post.Id, id, StringComparison.OrdinalIgnoreCase));

    private static IEnumerable<BoardPost> SortPosts(IEnumerable<BoardPost> posts) =>
        posts
            .OrderByDescending(post => post.IsPinned)
            .ThenByDescending(post => post.CreatedAt);

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

    private static string NormalizeAuthor(string? author)
    {
        var normalizedAuthor = author?.Trim();

        return string.IsNullOrWhiteSpace(normalizedAuthor) ? "TENVI" : normalizedAuthor;
    }

    private static List<BoardBlock> NormalizeBlocks(IEnumerable<BoardBlock>? blocks, string? fallbackContent)
    {
        if (blocks is null)
        {
            var normalizedContent = fallbackContent?.Trim() ?? string.Empty;

            return string.IsNullOrWhiteSpace(normalizedContent)
                ? []
                : [CreateTextBlock(normalizedContent)];
        }

        return blocks
            .Select(NormalizeBlock)
            .Where(block => block is not null)
            .Cast<BoardBlock>()
            .ToList();
    }

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

    private static BoardBlock CreateTextBlock(string content) => new()
    {
        Id = Guid.NewGuid().ToString("N"),
        Type = "text",
        Content = content
    };

    private static string NormalizeBlockId(string? id) =>
        string.IsNullOrWhiteSpace(id) ? Guid.NewGuid().ToString("N") : id.Trim();

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
