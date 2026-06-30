using Microsoft.Extensions.Configuration;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.Interfaces.Services;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class TeamIntroVideoStorageService : ITeamIntroVideoStorageService
    {
        private readonly string _rootPath;
        private const string PublicBasePath = "/storage/team-videos";
        private const string TeamIntroVideoRootConfigKey = "Storage:TeamIntroVideoRoot";

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".mp4", ".webm", ".mov"
        };

        public TeamIntroVideoStorageService(IConfiguration configuration)
        {
            _rootPath = configuration[TeamIntroVideoRootConfigKey]
                ?? throw new InvalidOperationException(
                    $"Missing configuration key '{TeamIntroVideoRootConfigKey}'. Ensure LocalStorageBootstrap runs at startup.");
        }

        public async Task<string> SaveIntroVideoAsync(int teamMemberId, string fileName, Stream content)
        {
            Directory.CreateDirectory(_rootPath);

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
                throw new AppException("Intro video must be MP4, WEBM, or MOV.");

            var storedName = $"{teamMemberId}-intro-video{extension}";
            var path = Path.Combine(_rootPath, storedName);

            await using var output = File.Create(path);
            await content.CopyToAsync(output);

            return storedName;
        }

        public string GetIntroVideoPublicUrl(string storedFileName)
        {
            if (string.IsNullOrWhiteSpace(storedFileName))
                return string.Empty;

            return $"{PublicBasePath}/{storedFileName.Trim()}";
        }

        public string GetContentType(string storedFileName)
        {
            var extension = Path.GetExtension(storedFileName).ToLowerInvariant();
            return extension switch
            {
                ".mp4" => "video/mp4",
                ".webm" => "video/webm",
                ".mov" => "video/quicktime",
                _ => "application/octet-stream"
            };
        }
    }
}
