namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class TeamMemberCertificate : BaseEntity
    {
        public int TeamMemberId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public DateOnly IssuedDate { get; set; }
        public DateOnly? ExpiryDate { get; set; }

        public virtual TeamMember TeamMember { get; set; } = null!;
    }
}
