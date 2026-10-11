using OffshoreManagementSystem.Domain.BaseEntity;
using OffshoreManagementSystem.Domain.Entities;

namespace OffsureManagementSystem.Domain.Entities
{
    /// <summary>
    /// Offshore team catalog folder (e.g. Software Development, NOC). Each team member belongs to at most one team.
    /// </summary>
    public class Team : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        /// <summary>Stored cover image file name; empty when the catalog should use the generated cover.</summary>
        public string CoverImage { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        public virtual ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    }
}
