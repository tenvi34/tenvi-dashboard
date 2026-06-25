using Microsoft.AspNetCore.Mvc;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    // 프론트엔드와 백엔드 연결 확인용 에코 요청
    [HttpPost("echo")]
    public IActionResult Echo([FromBody] EchoRequest? request)
    {
        // 연결 테스트 입력값 검증
        if (request is null || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new
            {
                message = "Message is required."
            });
        }

        return Ok(new EchoResponse
        {
            Message = request.Message.Trim(),
            ServerTime = DateTimeOffset.UtcNow
        });
    }
}

// 에코 요청 본문 계약
public class EchoRequest
{
    public string Message { get; set; } = string.Empty;
}

// 에코 응답 본문 계약
public class EchoResponse
{
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset ServerTime { get; set; }
}
