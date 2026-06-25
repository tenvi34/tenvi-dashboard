using Microsoft.AspNetCore.Mvc;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    [HttpPost("echo")]
    public IActionResult Echo([FromBody] EcoRequest request)
    {
        if (string.IsNullOrEmpty(request.Message))
        {
            return BadRequest(new
            {
                message = "메세지를 입력해주세요."
            });
        }

        return Ok(new EcoResponse
            {
                ReceivedMessage = request.Message,
                ServerTime = DateTime.Now
            }
        );
    }
}

public class EcoRequest
{
    public string Message { get; set; } = string.Empty;
}

public class EcoResponse
{
    public string ReceivedMessage { get; set; } = string.Empty;
    public DateTime ServerTime { get; set; }
}