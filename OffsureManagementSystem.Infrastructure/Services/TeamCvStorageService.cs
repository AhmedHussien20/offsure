using Microsoft.Extensions.Configuration;
using OffsureManagementSystem.Application.Interfaces.Services;
using System.Text;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class TeamCvStorageService : ITeamCvStorageService
    {
        private readonly string _rootPath;

        public TeamCvStorageService(IConfiguration configuration)
        {
            _rootPath = configuration["Storage:TeamCvRoot"]
                ?? Path.Combine(AppContext.BaseDirectory, "storage", "team-cvs");
        }

        public async Task<string> SaveGeneratedCvAsync(int teamMemberId, string fullName, string content)
        {
            Directory.CreateDirectory(_rootPath);

            var fileName = $"{teamMemberId}-{SanitizeFileName(fullName)}-cv.txt";
            var path = Path.Combine(_rootPath, fileName);

            await File.WriteAllTextAsync(path, content, Encoding.UTF8);
            return path;
        }

        public async Task<string> SaveUploadedCvAsync(int teamMemberId, string fileName, Stream content)
        {
            Directory.CreateDirectory(_rootPath);

            var extension = Path.GetExtension(fileName);
            var safeName = $"{teamMemberId}-uploaded-cv{extension}";
            var path = Path.Combine(_rootPath, safeName);

            await using var output = File.Create(path);
            await content.CopyToAsync(output);

            return path;
        }

        private static string SanitizeFileName(string value)
        {
            var invalidChars = Path.GetInvalidFileNameChars();
            var sanitized = new string(value
                .Trim()
                .Select(c => invalidChars.Contains(c) ? '-' : c)
                .ToArray());

            return string.IsNullOrWhiteSpace(sanitized)
                ? "team-member"
                : sanitized.Replace(' ', '-').ToLowerInvariant();
        }
    }
}
