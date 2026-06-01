using System.ComponentModel.DataAnnotations;

namespace OffsureManagementSystem.Application.DTOs.ContactDTOs
{
    public class ContactMessageDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Subject { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Message { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? ServiceCategory { get; set; }
    }
}
