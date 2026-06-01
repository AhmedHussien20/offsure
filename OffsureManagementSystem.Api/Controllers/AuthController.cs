using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.AuthDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : BaseController
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var result = await _authService.RegisterAsync(dto);
            return Success(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var result = await _authService.LoginAsync(dto);
            return Success(result);
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            await _authService.ForgotPasswordAsync(dto);
            return Success<string>(null!, "If an account with that email exists, a password reset link has been sent.");
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            await _authService.ResetPasswordAsync(dto);
            return Success<string>(null!, "Password reset successful. You can now log in with your new password.");
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] int userId, [FromQuery] string token)
        {
            await _authService.VerifyEmailAsync(userId, token);
            return Success<string>(null!, "Email verified successfully. You can now log in.");
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmailGet([FromQuery] int userId, [FromQuery] string token)
        {
            await _authService.VerifyEmailAsync(userId, token);
            return Success<string>(null!, "Email verified successfully. You can now log in.");
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto dto)
        {
            var result = await _authService.RefreshTokenAsync(dto);
            return Success(result);
        }

    }
}
