namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class ProjectResourceManager : BaseEntity
    {
        public int ProjectId { get; set; }
        public int ResourceManagerUserId { get; set; }
        /// <summary>Cost rate for this RM's team on this hourly project (per hour).</summary>
        public decimal? HourlyCostRate { get; set; }

        public bool IsActive { get; set; } = true;

        public virtual Project Project { get; set; }
        public virtual User ResourceManager { get; set; }
    }
}
