namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class TeamMember : BaseEntity
    {
        public int UserId { get; set; }
        public string Title { get; set; }
        public int YearsOfExperience { get; set; }
        public string CV { get; set; } // File path or blob
        public string ProfilePhoto { get; set; } = string.Empty;
        public string PhoneNumber { get; set; }
        public int? ResourceManagerId { get; set; }
        public bool IsAvailable { get; set; } = true;
        /// <summary>Default hourly salary/rate entered by admin when creating the member.</summary>
        public decimal? HourlySalary { get; set; }

        // Navigation Properties
        public virtual User User { get; set; }
        public virtual User ResourceManager { get; set; }
        public virtual ICollection<TeamMemberSkill> TeamMemberSkills { get; set; } = new List<TeamMemberSkill>();
        public virtual ICollection<TeamMemberCertificate> Certificates { get; set; } = new List<TeamMemberCertificate>();
        public virtual ICollection<TeamMemberExperience> Experiences { get; set; } = new List<TeamMemberExperience>();
        public virtual ICollection<ProjectAssignment> ProjectAssignments { get; set; } = new List<ProjectAssignment>();
    }
}
