using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TaskMangment.Application.Common.Interfaces;

namespace TaskMangment.Application.Common
{
    public class DomainEventDispatcher : IDomainEventDispatcher
    {
        private readonly IServiceProvider _serviceProvider;

        public DomainEventDispatcher(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public async Task PublishAsync<T>(T domainEvent)
        {
            Console.WriteLine("🔥 Dispatcher called");

            var handlers = _serviceProvider.GetServices<IEventHandler<T>>();

            foreach (var handler in handlers)
            {
                await handler.Handle(domainEvent);
            }
        }
    }

}
