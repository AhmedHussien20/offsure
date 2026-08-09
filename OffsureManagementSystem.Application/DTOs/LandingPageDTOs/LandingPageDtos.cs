using System.Text.Json;

namespace OffsureManagementSystem.Application.DTOs.LandingPageDTOs
{
    public class LandingPageSectionDto
    {
        public int Id { get; set; }
        public string SectionKey { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsDynamic { get; set; }
        public bool IsVisible { get; set; }
        public int SortOrder { get; set; }
        /// <summary>Parsed JSON object for the section content.</summary>
        public JsonElement Content { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class UpdateLandingPageSectionDto
    {
        public bool IsVisible { get; set; } = true;
        public JsonElement Content { get; set; }
    }

    public class BulkUpdateLandingPageSectionsDto
    {
        public List<BulkLandingPageSectionUpdateDto> Sections { get; set; } = new();
    }

    public class BulkLandingPageSectionUpdateDto
    {
        public string SectionKey { get; set; } = string.Empty;
        public bool IsVisible { get; set; } = true;
        public JsonElement Content { get; set; }
    }
}
