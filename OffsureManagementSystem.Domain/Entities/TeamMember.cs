namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class TeamMember : BaseEntity
    {
        public int UserId { get; set; }
        public string FullName { get; set; }
        public string Title { get; set; }
        public int YearsOfExperience { get; set; }
        public string CV { get; set; } // File path or blob
        public string PhoneNumber { get; set; }
        public int? LeaderId { get; set; } // Reference to another TeamMember for hierarchy
        public bool IsAvailable { get; set; } = true;

        // Navigation Properties
        public virtual User User { get; set; }
        public virtual TeamMember Leader { get; set; } // Self-referencing for hierarchy
        public virtual ICollection<TeamMember> TeamMembers { get; set; } = new List<TeamMember>(); // Subordinates
        public virtual ICollection<TeamMemberSkill> TeamMemberSkills { get; set; } = new List<TeamMemberSkill>();
        public virtual ICollection<ServiceRequestTeam> ServiceRequestTeams { get; set; } = new List<ServiceRequestTeam>();
        public virtual ICollection<ProjectAssignment> ProjectAssignments { get; set; } = new List<ProjectAssignment>();
    }
}
