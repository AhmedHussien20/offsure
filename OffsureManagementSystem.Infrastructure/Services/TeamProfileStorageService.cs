using Microsoft.Extensions.Configuration;
using OffsureManagementSystem.Application.Interfaces.Services;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class TeamProfileStorageService : ITeamProfileStorageService
    {
        private readonly string _rootPath;
        private const string PublicBasePath = "/storage/team-photos";

        public TeamProfileStorageService(IConfiguration configuration)
        {
            _rootPath = configuration[TeamPhotoRootConfigKey]
                ?? throw new InvalidOperationException(
                    $"Missing configuration key '{TeamPhotoRootConfigKey}'. Ensure LocalStorageBootstrap runs at startup.");
        }

        private const string TeamPhotoRootConfigKey = "Storage:TeamPhotoRoot";

        public async Task<string> SaveProfilePhotoAsync(int teamMemberId, string fileName, Stream content)
        {
            Directory.CreateDirectory(_rootPath);

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp"))
                throw new InvalidOperationException("Profile photo must be JPG, PNG, or WEBP.");

            var storedName = $"{teamMemberId}-photo{extension}";
            var path = Path.Combine(_rootPath, storedName);

            await using var output = File.Create(path);
            await content.CopyToAsync(output);

            return storedName;
        }

        public string GetPhotoPublicUrl(string storedFileName)
        {
            if (string.IsNullOrWhiteSpace(storedFileName))
                return string.Empty;

            return $"{PublicBasePath}/{storedFileName.Trim()}";
        }
    }
}
