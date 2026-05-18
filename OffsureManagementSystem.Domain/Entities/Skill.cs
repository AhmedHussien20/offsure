namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;
    using OffsureManagementSystem.Domain.Entities;

    public class Skill : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public int SkillCategoryId { get; set; } // e.g., Frontend, Backend, DevOps, QA
        public bool IsActive { get; set; } = true;

        // Navigation Properties
        public virtual ICollection<TeamMemberSkill> TeamMemberSkills { get; set; } = new List<TeamMemberSkill>();
        public virtual SkillCategory SkillCategory { get; set; }

    }
}
