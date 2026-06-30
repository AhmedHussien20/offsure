namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ITeamIntroVideoStorageService
    {
        Task<string> SaveIntroVideoAsync(int teamMemberId, string fileName, Stream content);
        string GetIntroVideoPublicUrl(string storedFileName);
        string GetContentType(string storedFileName);
    }
}
