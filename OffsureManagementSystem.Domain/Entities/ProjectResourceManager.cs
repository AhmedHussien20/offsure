namespace OffshoreManagementSystem.Domain.Entities
{
    using OffshoreManagementSystem.Domain.BaseEntity;

    public class ProjectResourceManager : BaseEntity
    {
        public int ProjectId { get; set; }
        public int ResourceManagerUserId { get; set; }

        public virtual Project Project { get; set; }
        public virtual User ResourceManager { get; set; }
    }
}
