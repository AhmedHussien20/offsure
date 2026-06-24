namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface ITeamCvStorageService
    {
        Task<string> SaveUploadedCvAsync(int teamMemberId, string fileName, Stream content);
        string GetCvPublicUrl(string storedPath);
        string GetCvFileName(string storedPath);
        (Stream Stream, string FileName, string ContentType)? OpenCvRead(string storedPath);
    }
}
