namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class TeamMemberExperience : BaseEntity
    {
        public int TeamMemberId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public DateOnly StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string Description { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }

        public virtual TeamMember TeamMember { get; set; } = null!;
    }
}
