using OffshoreManagementSystem.Domain.BaseEntity;
using OffshoreManagementSystem.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Domain.Entities
{
    public class SkillCategory : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; } = true;

        public virtual ICollection<Skill> Skills { get; set; } = new List<Skill>();
    }
}
