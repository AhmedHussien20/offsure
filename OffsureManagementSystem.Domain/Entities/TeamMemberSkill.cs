namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class TeamMemberSkill : BaseEntity
    {
        public int TeamMemberId { get; set; }
        public int SkillId { get; set; }
        public int ProficiencyLevel { get; set; } // 1-5 scale (Beginner to Expert)
        public int YearsOfExperience { get; set; }
        public DateTime AcquiredDate { get; set; }
        public bool IsEndorsed { get; set; } = false;
        public int? EndorsementCount { get; set; } = 0;

        // Navigation Properties
        public virtual TeamMember TeamMember { get; set; }
        public virtual Skill Skill { get; set; }
    }
}
