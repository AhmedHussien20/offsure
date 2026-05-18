using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Application.Interfaces.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class JWTTokenGenerator : IJWTTokenGenerator
    {
        private readonly IConfiguration _config;

        public JWTTokenGenerator(IConfiguration configuration)
        {
            _config = configuration;
        }

        public Task<string> GenerateToken(User user)
        {
            var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.NameIdentifier,   user.Id.ToString()),
            new Claim(ClaimTypes.Email,            user.Email),
            new Claim(ClaimTypes.GivenName,        user.FirstName),
            new Claim(ClaimTypes.Surname,          user.LastName),
            new Claim(ClaimTypes.Role,             user.Role?.Name ?? user.RoleId.ToString()),
        };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JWT:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["JWT:Issuer"],
                audience: _config["JWT:Audience"],
                claims: claims,
                expires: GetExpiration(),
                signingCredentials: creds
            );

            return Task.FromResult(new JwtSecurityTokenHandler().WriteToken(token));
        }

        public string GenerateRefreshToken()
        {
            var bytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes)
                          .Replace("+", "-")
                          .Replace("/", "_")
                          .Replace("=", "");
        }

        public DateTime GetExpiration()
            => DateTime.UtcNow.AddMinutes(
                   int.Parse(_config["JWT:AccessTokenExpirationMinutes"] ?? "15"));
        public DateTime GetRefreshTokenExpiration()
            => DateTime.UtcNow.AddDays(
                   int.Parse(_config["JWT:RefreshTokenExpirationDays"] ?? "7"));
    }
}
