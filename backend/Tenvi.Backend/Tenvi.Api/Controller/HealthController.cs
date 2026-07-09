using Microsoft.AspNetCore.Mvc;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    // API 상태 확인용 경량 엔드포인트
    [HttpGet]
    public IActionResult Get()
    {
        // 백엔드 상태 응답
        return Ok(new
        {
            ok = true,
            service = "TENVI API",
            message = "Backend is Running",
            checkedAt = DateTime.UtcNow
        });
    }
}
