namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class ProjectSkill : BaseEntity
    {
        public int ProjectId { get; set; }
        public int SkillId { get; set; }
        /// <summary>When true, the skill is required/selected for this project.</summary>
        public bool IsSelected { get; set; } = true;

        public virtual Project Project { get; set; }
        public virtual Skill Skill { get; set; }
    }
}
