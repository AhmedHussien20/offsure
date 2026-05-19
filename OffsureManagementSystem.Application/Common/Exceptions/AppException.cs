using Microsoft.AspNetCore.Http; 

namespace OffsureManagementSystem.Application.Common.Exceptions
{
    public class AppException : Exception
    {
        public int StatusCode { get; }

        public AppException(
            string message,
            int statusCode = StatusCodes.Status400BadRequest)
            : base(message)
        {
            StatusCode = statusCode;
        }
    }

}
