using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System;
using System.Text.Json;
using System.Threading.Tasks;
using TaskMangment.Application.Common.Interfaces;

namespace TaskMangment.Infrastructure.Caching
{

    public class RedisCachingService : ICachingService
    {
        private readonly IDistributedCache _cache;
        private readonly ILogger<RedisCachingService> _logger;


        public RedisCachingService(IDistributedCache cache, ILogger<RedisCachingService> logger)
        {
            _cache = cache;
            _logger = logger;
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            var data = await _cache.GetStringAsync(key);
            return data is null ? default : JsonSerializer.Deserialize<T>(data);
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan expiration)
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration
            };

            var json = JsonSerializer.Serialize(value);
            await _cache.SetStringAsync(key, json, options);
        }

        public async Task RemoveAsync(string key)
        {
            await _cache.RemoveAsync(key);
        }

      
    }
}
