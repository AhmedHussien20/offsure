using OffsureManagementSystem.Application.Common.Requests;

namespace OffsureManagementSystem.Application.DTOs.SkillManagementDTOs
{
    public class SkillCategoryRequest : BaseApiRequest
    {
        public bool? IsActive { get; set; }
    }

    public class SkillRequest : BaseApiRequest
    {
        public int? SkillCategoryId { get; set; }
        public bool? IsActive { get; set; }
    }

    public class CreateSkillCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateSkillCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class SkillCategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public int SkillsCount { get; set; }
    }

    public class CreateSkillDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int SkillCategoryId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateSkillDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int SkillCategoryId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class SkillDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int SkillCategoryId { get; set; }
        public string SkillCategoryName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int AssignedTeamMembersCount { get; set; }
    }
}
