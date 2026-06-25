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
    public ActionResult<IEnumerable<BoardPost>> GetPosts()
    {
        lock (PostsLock)
        {
            // 고정 게시글 우선, 최신 작성순 유지
            return Ok(Posts
                .OrderByDescending(post => post.IsPinned)
                .ThenByDescending(post => post.CreatedAt)
                .ToList());
        }
    }

    // 게시글 상세 조회
    [HttpGet("{id}")]
    public ActionResult<BoardPost> GetPost(string id)
    {
        lock (PostsLock)
        {
            var post = FindPost(id);

            if (post is null)
            {
                return NotFound();
            }

            return Ok(post);
        }
    }

    // 게시글 생성 요청 검증과 초기값 구성
    [HttpPost]
    public ActionResult<BoardPost> CreatePost([FromBody] CreateBoardPostRequest? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new
            {
                message = "Title is required."
            });
        }

        var now = DateTimeOffset.UtcNow;
        var post = new BoardPost
        {
            Id = Guid.NewGuid().ToString("N"),
            Title = request.Title.Trim(),
            Content = request.Content?.Trim() ?? string.Empty,
            CategoryId = request.CategoryId?.Trim() ?? string.Empty,
            IsPinned = request.IsPinned,
            ViewCount = 0,
            CreatedAt = now,
            UpdatedAt = now
        };

        lock (PostsLock)
        {
            // DB 연결 전까지 프로세스 메모리에만 보관
            Posts.Add(post);
        }

        return CreatedAtAction(nameof(GetPost), new { id = post.Id }, post);
    }

    // 게시글 수정 요청 검증과 기존 데이터 갱신
    [HttpPut("{id}")]
    public ActionResult<BoardPost> UpdatePost(string id, [FromBody] UpdateBoardPostRequest? request)
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
            post.Title = request.Title.Trim();
            post.Content = request.Content?.Trim() ?? string.Empty;
            post.CategoryId = request.CategoryId?.Trim() ?? string.Empty;
            post.IsPinned = request.IsPinned;
            post.UpdatedAt = DateTimeOffset.UtcNow;

            return Ok(post);
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

            Posts.Remove(post);
            return NoContent();
        }
    }

    // 대소문자 차이를 허용하는 게시글 식별자 조회
    private static BoardPost? FindPost(string id) =>
        Posts.FirstOrDefault(post => string.Equals(post.Id, id, StringComparison.OrdinalIgnoreCase));
}
