using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.AuthDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using System.Security.Claims;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/account")]
    [ApiController]
    [Authorize]
    public class AccountController : BaseController
    {
        private readonly IAuthService _authService;

        public AccountController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var profile = await _authService.GetAccountProfileAsync(GetCurrentUserId());
            return Success(profile);
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateAccountProfileDto dto)
        {
            var profile = await _authService.UpdateAccountProfileAsync(GetCurrentUserId(), dto);
            return Success(profile, "Profile updated successfully.");
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            await _authService.ChangePasswordAsync(GetCurrentUserId(), dto);
            return Success<string>(null!, "Password changed successfully. Please sign in again.");
        }

        private int GetCurrentUserId()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
                throw new UnauthorizedAccessException("Invalid user token.");

            return userId;
        }
    }
}
