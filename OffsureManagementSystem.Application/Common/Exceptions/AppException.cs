using Microsoft.AspNetCore.Http; 

namespace OffsureManagementSystem.Application.Common.Exceptions
{
    public class AppException : Exception
    {
        public string ErrorCode { get; }
        public int StatusCode { get; }

        public AppException(
            string errorCode,
            int statusCode = StatusCodes.Status400BadRequest)
            : base(errorCode)
        {
            ErrorCode = errorCode;
            StatusCode = statusCode;
        }
    }

}
