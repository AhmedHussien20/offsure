using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Infrastructure;
using OffshoreManagementSystem.Infrastructure.DataContext;
using OffsureManagementSystem.Infrastructure.Services;
using Hangfire;
using Hangfire.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection("EmailSettings")
);
builder.Services.AddTransient<IEmailService, EmailService>();

builder.Services.AddHangfire(cfg =>
    cfg.UseSqlServerStorage(builder.Configuration.GetConnectionString("DefaultConnection"))
);
builder.Services.AddHangfireServer();

var app = builder.Build();

app.UseHangfireDashboard("/hangfire");

using (var scope = app.Services.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobManager.AddOrUpdate(
        "send-daily-report",
        Job.FromExpression<IEmailService>(x =>
            x.SendEmailAsync("Daily Report", "Hello from Hangfire Worker!")),
        Cron.Minutely()
    );
}

app.Run();