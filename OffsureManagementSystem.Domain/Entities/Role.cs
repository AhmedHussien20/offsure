using OffshoreManagementSystem.Domain.BaseEntity;
using OffshoreManagementSystem.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Domain.Entities
{
    public class Role : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; } = true;

        public virtual ICollection<User> Users { get; set; } = new List<User>();
    }
}
