using Microsoft.Extensions.DependencyInjection;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Infrastructure.Repositories;
using OffsureManagementSystem.Utilities.Localization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddDI(this IServiceCollection services)
        {
            services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
            services.AddSingleton<IEmailService, EmailService>();
            services.AddSingleton<LocalizationService>();

            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IJWTTokenGenerator, JWTTokenGenerator>();
            services.AddScoped<ITeamManagementService, TeamManagementService>();
            services.AddScoped<ITeamCvStorageService, TeamCvStorageService>();


            return services;
        }
    }
}
