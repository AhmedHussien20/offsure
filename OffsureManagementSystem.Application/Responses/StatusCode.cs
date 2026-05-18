using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Application.Responses
{
    public enum StatusCode
    {
        Success = 1,
        Updated = 2,


        // 2xx Success
        OK = 200,
        Created = 201,
        Accepted = 202,
        NonAuthoritativeInformation = 203,
        NoContent = 204,
        ResetContent = 205,
        PartialContent = 206,

        // 4xx Client Errors
        BadRequest = 600,
        Unauthorized = 401,
        PaymentRequired = 402,
        Forbidden = 403,
        NotFound = 404,

        // 5xx Server Errors
        InternalServerError = 500,
        NotImplemented = 501,

    }
}
