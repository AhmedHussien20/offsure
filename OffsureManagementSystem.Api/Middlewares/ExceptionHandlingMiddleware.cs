
using OffsureManagementSystem.Application.Common.Errors;
using OffsureManagementSystem.Application.Responses;
using OffsureManagementSystem.Application.Common.Exceptions;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IServiceScopeFactory scopeFactory,
        IConfiguration config)
    {
        _next = next;
        _logger = logger;
        _config = config;
        _scopeFactory = scopeFactory;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            _logger.LogWarning(ex, "Handled application exception");
            await WriteError(context, ex.ErrorCode, (int)ex.StatusCode);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access");


            await WriteError(
                context,
                ErrorCodes.Unauthorized,
                StatusCodes.Status401Unauthorized);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteError(
                context,
                ErrorCodes.SaveFailed,
                StatusCodes.Status500InternalServerError);
        }
    }

    private async Task WriteError(HttpContext context, string errorCode, int statusCode)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new ApiResponse<object>
        {
            Success = false,
            Error = true,
            ErrorCode = errorCode,
            Message = errorCode,
            Data = null
        };

        await context.Response.WriteAsJsonAsync(response);
    }

}
