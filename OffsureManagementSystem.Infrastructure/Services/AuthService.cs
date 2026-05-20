using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Application.DTOs.AuthDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly IRepository<User> _userRepo;
        private readonly IRepository<Client> _clientRepo;
        private readonly IJWTTokenGenerator _jwtGenerator;
        private readonly IRepository<Role> _roleRepo;
        private readonly IConfiguration _config;
        private readonly IEmailNotificationService _emailNotificationService;

        public AuthService(
            IRepository<User> userRepo,
            IRepository<Client> clientRepo,
            IJWTTokenGenerator jwtGenerator,
            IRepository<Role> roleRepo,
            IConfiguration config,
            IEmailNotificationService emailNotificationService) 
        {
            _userRepo = userRepo;
            _clientRepo = clientRepo;
            _jwtGenerator = jwtGenerator;
            _config = config;
            _roleRepo = roleRepo;
            _emailNotificationService = emailNotificationService;
        }

        // ── Register (Client Only) ────────────────────────────────────────────
        public async Task<RegisterResponseDto> RegisterAsync(RegisterDto dto)
        {
            //check for existing email 
            var existingUser = _userRepo
                .GetAll(u => u.Email == dto.Email.ToLower().Trim())
                .FirstOrDefault();

            if (existingUser is not null)
                throw new Exception("Email already exists.");

            var clientRole = await _roleRepo.GetAll(r => r.Name == "Client").FirstOrDefaultAsync();

            if (clientRole is null)
                throw new Exception("Client role not found.");

            var user = new User
            {
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = dto.Email.ToLower().Trim(),
                PasswordHash = HashPassword(dto.Password),
                RoleId = clientRole.Id,
                IsEmailVerified = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                EmailVerificationToken = GenerateSecureToken(),
                EmailVerificationExpiry = DateTime.UtcNow.AddHours(24),
            };

            await _userRepo.AddAsync(user);
            await _userRepo.SaveChangesAsync();

        var client = new Client
            {
                UserId = user.Id,
                CompanyName = dto.CompanyName.Trim(),
                ContactPersonPhone = dto.ContactPersonPhone,
                CompanyAddress = dto.CompanyAddress,
                City = dto.City,
                Country = dto.Country,
                PostalCode = dto.PostalCode,
                Website = dto.Website,
                Description = dto.Description,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            await _clientRepo.AddAsync(client);
            await _clientRepo.SaveChangesAsync();
            await _emailNotificationService.SendVerificationEmailAsync(
                user.Email,
                user.FirstName,
                user.Id,
                user.EmailVerificationToken);

            return new RegisterResponseDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                CompanyName = dto.CompanyName.Trim(),
                Message = "Registration successful. Your account is pending email verification.",
            };
        }

        // ── Login ─────────────────────────────────────────────────────────────
        public async Task<LoginResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _userRepo
                .GetAll(u => u.Email == dto.Email.ToLower().Trim())
                .Include(u => u.Role)
                .FirstOrDefaultAsync();

            if (user is null)
                throw new Exception("Invalid email or password.");

            if (!VerifyPassword(dto.Password, user.PasswordHash))
                throw new Exception("Invalid email or password.");

            if (!user.IsActive)
                throw new Exception("Your account has been deactivated. Please contact support.");

            if (!user.IsEmailVerified)
                throw new Exception("Please verify your email before logging in.");

            var accessToken = await _jwtGenerator.GenerateToken(user);
            var refreshToken = _jwtGenerator.GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiry = _jwtGenerator.GetRefreshTokenExpiration();
            user.LastLoginAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(user,
                nameof(user.RefreshToken),
                nameof(user.RefreshTokenExpiry),
                nameof(user.LastLoginAt),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();

            return BuildLoginResponse(accessToken, refreshToken, user);
        }

        // ── Refresh Token ─────────────────────────────────────────────────────
        public async Task<LoginResponseDto> RefreshTokenAsync(RefreshTokenDto dto)
        {
            var user = await _userRepo
                .GetAll(u => u.RefreshToken == dto.RefreshToken)
                .Include(u => u.Role)
                .FirstOrDefaultAsync();

            if (user is null)
                throw new Exception("Invalid refresh token.");

            if (user.RefreshTokenExpiry < DateTime.UtcNow)
                throw new Exception("Refresh token has expired. Please login again.");

            var newAccessToken = await _jwtGenerator.GenerateToken(user);
            var newRefreshToken = _jwtGenerator.GenerateRefreshToken();

            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiry = _jwtGenerator.GetRefreshTokenExpiration();
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(user,
                nameof(user.RefreshToken),
                nameof(user.RefreshTokenExpiry),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();

            return BuildLoginResponse(newAccessToken, newRefreshToken, user);
        }

        // ── Forgot Password ───────────────────────────────────────────────────
        public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
        {
            var user = _userRepo
                .GetAll(u => u.Email == dto.Email.ToLower().Trim())
                .FirstOrDefault();

            if (user is null) return;

            user.PasswordResetToken = GenerateSecureToken();
            user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(user,
                nameof(user.PasswordResetToken),
                nameof(user.PasswordResetTokenExpiry),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();

            await _emailNotificationService.SendPasswordResetEmailAsync(
                user.Email,
                user.PasswordResetToken);
        }

        // ── Reset Password ────────────────────────────────────────────────────
        public async Task ResetPasswordAsync(ResetPasswordDto dto)
        {
            var user = _userRepo
                .GetAll(u => u.PasswordResetToken == dto.Token)
                .FirstOrDefault();

            if (user is null)
                throw new Exception("Invalid or expired reset token.");

            if (user.PasswordResetTokenExpiry < DateTime.UtcNow)
                throw new Exception("Reset token has expired. Please request a new one.");

            user.PasswordHash = HashPassword(dto.NewPassword);
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(user,
                nameof(user.PasswordHash),
                nameof(user.PasswordResetToken),
                nameof(user.PasswordResetTokenExpiry),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();
        }

        // ── Verify Email ──────────────────────────────────────────────────────
        public async Task VerifyEmailAsync(int userId)
        {
            var user = await _userRepo.GetByIDAsync(userId);

            if (user is null)
                throw new Exception("User not found.");

            if (user.IsEmailVerified)
                return; 

            user.IsEmailVerified = true;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(user,
                nameof(user.IsEmailVerified),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();
        }

        // ── Private Helpers ───────────────────────────────────────────────────

        private static string HashPassword(string password)
            => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

        private static bool VerifyPassword(string password, string hash)
            => BCrypt.Net.BCrypt.Verify(password, hash);

        private static string GenerateSecureToken()
        {
            var bytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes)
                          .Replace("+", "-")
                          .Replace("/", "_")
                          .Replace("=", "");
        }

        private LoginResponseDto BuildLoginResponse(string accessToken, string refreshToken, User user)
            => new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                AccessTokenExpiresAt = _jwtGenerator.GetExpiration(),
                RefreshTokenExpiresAt = _jwtGenerator.GetRefreshTokenExpiration(),
                User = new UserInfoDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    Role = user.Role?.Name ?? user.RoleId.ToString(),
                }
            };
    }
}
