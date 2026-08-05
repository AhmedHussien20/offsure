namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IClientAccessService
    {
        /// <summary>Own client id for the logged-in user.</summary>
        Task<int> GetOwnClientIdForUserAsync(int userId);

        /// <summary>
        /// Client ids the user may see data for:
        /// Owner → self + organization members; Member → self only.
        /// </summary>
        Task<IReadOnlyList<int>> GetAccessibleClientIdsForUserAsync(int userId);

        Task<bool> CanAccessClientIdAsync(int userId, int targetClientId);
    }
}
