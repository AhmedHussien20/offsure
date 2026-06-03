using OffsureManagementSystem.Application.DTOs.AuthDTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IAuthService
    {
        Task<RegisterResponseDto> RegisterAsync(RegisterDto dto);
        Task<LoginResponseDto> LoginAsync(LoginDto dto);
        Task<LoginResponseDto> RefreshTokenAsync(RefreshTokenDto dto);
        Task ForgotPasswordAsync(ForgotPasswordDto dto);
        Task VerifyEmailAsync(int userId, string token);
        Task ResetPasswordAsync(ResetPasswordDto dto);
        Task<AccountProfileDto> GetAccountProfileAsync(int userId);
        Task<AccountProfileDto> UpdateAccountProfileAsync(int userId, UpdateAccountProfileDto dto);
        Task ChangePasswordAsync(int userId, ChangePasswordDto dto);
    }
}
