using System;
using System.Threading.Tasks;
using TaskMangment.Application.Common.Interfaces;

namespace TaskMangment.Infrastructure.Caching
{
    public class NoCacheService : ICachingService
    {
        public Task<T?> GetAsync<T>(string key)
            => Task.FromResult<T?>(default);

        public Task SetAsync<T>(string key, T value, TimeSpan expiration)
            => Task.CompletedTask;

        public Task RemoveAsync(string key)
            => Task.CompletedTask;

        
    }
}
