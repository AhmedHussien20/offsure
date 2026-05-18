using OffsureManagementSystem.API.Middlewares;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using Serilog;

namespace OffsureManagementSystem.API.Middlewares
{
    public class ExceptionLogMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly Serilog.ILogger _logger;
        private readonly IEmailService _emailService;

        public ExceptionLogMiddleware(RequestDelegate next, IEmailService emailService)
        {
            _next = next;
            _emailService = emailService;

            var logDir = Path.Combine(Directory.GetCurrentDirectory(), "Logs");
            if (!Directory.Exists(logDir))
                Directory.CreateDirectory(logDir);

            var logPath = Path.Combine(logDir, "log-" + DateTime.Now.ToString("yyyy-MM-dd") + ".txt");

            _logger = new LoggerConfiguration()
                .WriteTo.File(
                    path: logPath,
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 30,
                    outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level}] {Message}{NewLine}{Exception}"

                )
                .CreateLogger();
        }


        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Unhandled exception occurred");
                StatusCode statusCode = StatusCode.InternalServerError;

                var firstLine = ex.StackTrace?.Split(Environment.NewLine).FirstOrDefault();

                _ = _emailService.SendEmailAsync(
                    "Unhandled Exception",
                    $"error:{(int)statusCode} : {ex.Message}<br>At: {firstLine}"
                );

   

                string message = "Internal Server Error";

                if (ex is UnauthorizedAccessException)
                {
                    statusCode = StatusCode.Unauthorized;
                    message = ex.Message;
                }
                else if (ex is AppException appEx)
                {
                    statusCode = appEx.StatusCode;
                    message = appEx.Message;
                }
                else
                {
                    message = ex.Message;
                }

                await HandleExceptionAsync(context, message, (int)statusCode);
            }
        }

        private Task HandleExceptionAsync(HttpContext context, string message, int statusCode)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = statusCode;

            var response = new
            {
                error = true,
                message = message
            };

            return context.Response.WriteAsJsonAsync(response);
        }
    }

    public class AppException : Exception
    {
        public StatusCode StatusCode { get; }

        public AppException(string message, StatusCode statusCode) : base(message)
        {
            StatusCode = statusCode;
        }
    }
    
}
