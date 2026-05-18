using OffshoreManagementSystem.Domain.Entities;
using OffsureManagementSystem.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IJWTTokenGenerator
    {
        Task<string> GenerateToken(User user);
        string GenerateRefreshToken();
        DateTime GetExpiration();
        DateTime GetRefreshTokenExpiration();
    }
}
