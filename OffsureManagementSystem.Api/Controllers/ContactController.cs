using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.ContactDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/contact")]
    [ApiController]
    public class ContactController : BaseController
    {
        private readonly IEmailNotificationService _emailNotificationService;

        public ContactController(IEmailNotificationService emailNotificationService)
        {
            _emailNotificationService = emailNotificationService;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Send([FromBody] ContactMessageDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<string>.Fail("Invalid contact message."));
            }

            await _emailNotificationService.NotifyAdminsOfContactMessageAsync(dto);
            return Success(true, "Your message has been sent successfully.");
        }
    }
}
