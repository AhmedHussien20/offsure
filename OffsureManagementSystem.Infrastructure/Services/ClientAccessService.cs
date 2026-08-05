using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities.Enum;
using Client = OffshoreManagementSystem.Domain.Entities.Client;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class ClientAccessService : IClientAccessService
    {
        private readonly IRepository<Client> _clientRepo;

        public ClientAccessService(IRepository<Client> clientRepo)
        {
            _clientRepo = clientRepo;
        }

        public async Task<int> GetOwnClientIdForUserAsync(int userId)
        {
            var clientId = await _clientRepo
                .Query()
                .AsNoTracking()
                .Where(c => c.UserId == userId && c.IsActive && !c.IsDeleted)
                .Select(c => c.Id)
                .FirstOrDefaultAsync();

            if (clientId == 0)
                throw new AppException("Client profile not found for current user.", 404);

            return clientId;
        }

        public async Task<IReadOnlyList<int>> GetAccessibleClientIdsForUserAsync(int userId)
        {
            var client = await _clientRepo
                .Query()
                .AsNoTracking()
                .Where(c => c.UserId == userId && c.IsActive && !c.IsDeleted)
                .Select(c => new { c.Id, c.AccountRole })
                .FirstOrDefaultAsync();

            if (client is null)
                throw new AppException("Client profile not found for current user.", 404);

            if (client.AccountRole != ClientAccountRole.Owner)
                return new[] { client.Id };

            var memberIds = await _clientRepo
                .Query()
                .AsNoTracking()
                .Where(c =>
                    c.ParentClientId == client.Id
                    && c.AccountRole == ClientAccountRole.Member
                    && !c.IsDeleted)
                .Select(c => c.Id)
                .ToListAsync();

            var ids = new List<int>(memberIds.Count + 1) { client.Id };
            ids.AddRange(memberIds);
            return ids;
        }

        public async Task<bool> CanAccessClientIdAsync(int userId, int targetClientId)
        {
            var accessible = await GetAccessibleClientIdsForUserAsync(userId);
            return accessible.Contains(targetClientId);
        }
    }
}
