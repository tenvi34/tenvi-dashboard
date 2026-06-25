using Microsoft.AspNetCore.Mvc;

namespace Tenvi.Api.Controller;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            ok = true,
            service = "TENVI API",
            message = "Backend is Running",
            checkedAt = DateTimeOffset.UtcNow
        });
    }
}