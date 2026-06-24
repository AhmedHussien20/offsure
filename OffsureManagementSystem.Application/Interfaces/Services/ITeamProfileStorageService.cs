namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ITeamProfileStorageService
    {
        Task<string> SaveProfilePhotoAsync(int teamMemberId, string fileName, Stream content);
        string GetPhotoPublicUrl(string storedFileName);
    }
}
