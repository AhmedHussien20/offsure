using FluentValidation;
using OffsureManagementSystem.Application.DTOs.AuthDTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Application.Validators
{
    public class RegisterDtoValidator : AbstractValidator<RegisterDto>
    {
        public RegisterDtoValidator()
        {
            RuleFor(x => x.Password)
                .NotEmpty()
                .WithMessage("Password is required.")

                .MinimumLength(8)
                .WithMessage("Password must be at least 8 characters.")

                .Matches("[A-Z]")
                .WithMessage("Password must contain at least one uppercase letter.")

                .Matches("[a-z]")
                .WithMessage("Password must contain at least one lowercase letter.")

                .Matches("[0-9]")
                .WithMessage("Password must contain at least one number.")

                .Matches("[^a-zA-Z0-9]")
                .WithMessage("Password must contain at least one special character.");
        }
    }
}
