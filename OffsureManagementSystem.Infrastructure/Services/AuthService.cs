using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Application.Common;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.AuthDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities;
using OffsureManagementSystem.Domain.Entities.Enum;
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
                throw new AppException("Email already exists.");

            var clientRole = await _roleRepo.GetAll(r => r.Name == "Client").FirstOrDefaultAsync();

            if (clientRole is null)
                throw new AppException("Client role not found.");

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
                AccountRole = ClientAccountRole.Owner,
                ParentClientId = null,
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
                Message =
                    $"Registration successful. Check your email to verify your {BrandingConstants.ClientPortalName} account.",
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
                throw new AppException("Invalid email or password.");

            if (!VerifyPassword(dto.Password, user.PasswordHash))
                throw new AppException("Invalid email or password.");

            await EnsureUserCanAuthenticateAsync(user);

            if (!user.IsEmailVerified)
                throw new AppException(
                    $"Please verify your email before logging in. Check your inbox for a verification message from {BrandingConstants.ServiceProviderName}.");

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
                throw new AppException("Invalid refresh token.");

            if (user.RefreshTokenExpiry < DateTime.UtcNow)
                throw new AppException("Refresh token has expired. Please login again.");

            await EnsureUserCanAuthenticateAsync(user);

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
                throw new AppException("Invalid or expired reset token.");

            if (user.PasswordResetTokenExpiry < DateTime.UtcNow)
                throw new AppException("Reset token has expired. Please request a new one.");

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

        // ── Account profile (authenticated) ───────────────────────────────────
        public async Task<AccountProfileDto> GetAccountProfileAsync(int userId)
        {
            var user = await _userRepo
                .Query()
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user is null)
                throw new AppException("User not found.", 404);

            return MapAccountProfile(user);
        }

        public async Task<AccountProfileDto> UpdateAccountProfileAsync(int userId, UpdateAccountProfileDto dto)
        {
            ValidateAccountProfileInput(dto);

            var user = await _userRepo.GetByIDAsync(userId);
            if (user is null)
                throw new AppException("User not found.", 404);

            if (!user.IsActive)
                throw new AppException("Your account is inactive.", 400);

            user.FirstName = dto.FirstName.Trim();
            user.LastName = dto.LastName.Trim();
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                user,
                nameof(user.FirstName),
                nameof(user.LastName),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();

            return await GetAccountProfileAsync(userId);
        }

        public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
                throw new AppException("Current and new password are required.", 400);

            if (dto.NewPassword.Length < 8)
                throw new AppException("New password must be at least 8 characters.", 400);

            var user = await _userRepo.GetByIDAsync(userId);
            if (user is null)
                throw new AppException("User not found.", 404);

            if (!VerifyPassword(dto.CurrentPassword, user.PasswordHash))
                throw new AppException("Current password is incorrect.", 400);

            if (VerifyPassword(dto.NewPassword, user.PasswordHash))
                throw new AppException("New password must be different from your current password.", 400);

            user.PasswordHash = HashPassword(dto.NewPassword);
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(
                user,
                nameof(user.PasswordHash),
                nameof(user.RefreshToken),
                nameof(user.RefreshTokenExpiry),
                nameof(user.UpdatedAt));

            await _userRepo.SaveChangesAsync();
        }

        // ── Verify Email ──────────────────────────────────────────────────────
        public async Task VerifyEmailAsync(int userId, string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                throw new AppException("Invalid verification link.", 400);

            var user = await _userRepo.GetByIDAsync(userId);

            if (user is null)
                throw new AppException("User not found.", 404);

            if (user.IsEmailVerified)
                return;

            if (!string.Equals(user.EmailVerificationToken, token.Trim(), StringComparison.Ordinal))
                throw new AppException("Invalid or expired verification link.", 400);

            if (user.EmailVerificationExpiry is null || user.EmailVerificationExpiry < DateTime.UtcNow)
                throw new AppException(
                    $"Verification link has expired. Please register again or contact {BrandingConstants.ServiceProviderName} support.",
                    400);

            user.IsEmailVerified = true;
            user.EmailVerificationToken = null;
            user.EmailVerificationExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            _userRepo.SaveInclude(user,
                nameof(user.IsEmailVerified),
                nameof(user.EmailVerificationToken),
                nameof(user.EmailVerificationExpiry),
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

        private async Task EnsureUserCanAuthenticateAsync(User user)
        {
            if (!user.IsActive)
                throw new AppException("Your account has been deactivated. Please contact support.");

            if (string.Equals(user.Role?.Name, "Client", StringComparison.OrdinalIgnoreCase))
            {
                var client = await _clientRepo
                    .GetAll(c => c.UserId == user.Id)
                    .FirstOrDefaultAsync();

                if (client is not null && !client.IsActive)
                    throw new AppException("Your client account has been deactivated. Please contact support.");
            }
        }

        private static void ValidateAccountProfileInput(UpdateAccountProfileDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.LastName))
                throw new AppException("First name and last name are required.", 400);
        }

        private static AccountProfileDto MapAccountProfile(User user)
            => new AccountProfileDto
            {
                Id = user.Id,
                FirstName = user.FirstName ?? string.Empty,
                LastName = user.LastName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                Role = user.Role?.Name ?? string.Empty,
            };

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
