using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Application.Common.Errors
{
    public static class ErrorCodes
    {
        public const string NotFound = "NOT_FOUND";
        public const string EmailNotFound = "EMAIL_NOT_FOUND";
        public const string Invalid = "INVALID_PASS_OR_EMAIL";
        public const string InvalidToken = "INVALID_TOKEN";
        public const string EmailAlreadyExists = "EMAIL_ALREADY_EXISTS";
        public const string EmployeeHasActiveTasks = "EMPLOYEE_HAS_ACTIVE_TASKS";

        public const string NotAuthorized = "NOT_AUTHORIZED";
        public const string ValidationError = "VALIDATION_ERROR";
        public const string SaveFailed = "SAVE_FAILED";

        public const string Unauthorized = "Unauthorized";

    
    }

}
