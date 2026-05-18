using OffsureManagementSystem.Application.Interfaces.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks; 

public class HangfireCurrentUserService : ICurrentUserService
{
    public int? UserId => null;
    public string? UserName => "Hangfire";
    public bool IsAuthenticated => false;

    public int? CompanyId => throw new NotImplementedException();
}

