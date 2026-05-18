using OffshoreManagementSystem.Domain.BaseEntity;
using OffshoreManagementSystem.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Domain.Entities
{
    public class ServiceCategory : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconUrl { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        public virtual ICollection<Service> Services { get; set; } = new List<Service>();
    }
}
