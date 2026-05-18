using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ICurrentUserService
    {
        int? UserId { get; } 
        string? UserName { get; }
        int? CompanyId { get; }
    }

}
