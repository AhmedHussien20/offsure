namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ITeamCvStorageService
    {
        Task<string> SaveGeneratedCvAsync(int teamMemberId, string fullName, string content);
        Task<string> SaveUploadedCvAsync(int teamMemberId, string fileName, Stream content);
    }
}
