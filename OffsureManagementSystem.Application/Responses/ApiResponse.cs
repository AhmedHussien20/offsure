using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Application.Responses
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public bool Error { get; set; }
        public string? ErrorCode { get; set; }
        public StatusCode Status_Code { get; set; }
        public string Message { get; set; } = string.Empty;
        public T Data { get; set; }

        public static ApiResponse<T> Ok(T data)
         => new()
         {
             Success = true,
             Error = false,
             Data = data
         };

        public static ApiResponse<T> Ok(T data, string message)
            => new()
            {
                Success = true,
                Error = false,
                Message = message,
                Data = data
            };

        public static ApiResponse<T> Fail(
            string errorCode,
            StatusCode statusCode = StatusCode.BadRequest)
            => new()
            {
                Success = false,
                Error = true,
                ErrorCode = errorCode,
                Message = errorCode
            };
    }
}
