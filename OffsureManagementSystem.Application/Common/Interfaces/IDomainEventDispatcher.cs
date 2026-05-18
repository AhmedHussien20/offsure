using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TaskMangment.Application.Common.Interfaces
{
    public interface IDomainEventDispatcher
    {
        Task PublishAsync<T>(T domainEvent);
    }

}
