using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BaseController : ControllerBase
    {
        protected IActionResult Success<T>(T data, string? message = null)
        {
            return Ok(ApiResponse<T>.Ok(data, message));
        }

        protected IActionResult Fail(string message, int statusCode = 400)
        {
            return StatusCode(statusCode, ApiResponse<string>.Fail(message));
        }


    }
}
