namespace OffsureManagementSystem.Application.Interfaces.Services
{
    public interface IProjectInvoiceStorageService
    {
        Task<string> SaveAsync(int projectId, string kind, string fileName, Stream content);
        string GetPublicUrl(string storedFileName);
        void TryDelete(string? storedFileName);
    }
}
