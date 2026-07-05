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
            // Video
            ".mp4", ".webm", ".mov",
            // Audio
            ".mp3", ".m4a", ".wav", ".ogg", ".oga"
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
                throw new AppException("Introduction must be a video (MP4, WEBM, MOV) or audio (MP3, M4A, WAV, OGG) file.");

            var storedName = ResolveStoredFileName(teamMemberId, fileName);
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
            if (extension == ".webm"
                && storedFileName.Contains("-intro-audio", StringComparison.OrdinalIgnoreCase))
            {
                return "audio/webm";
            }

            return extension switch
            {
                ".mp4" => "video/mp4",
                ".webm" => "video/webm",
                ".mov" => "video/quicktime",
                ".mp3" => "audio/mpeg",
                ".m4a" => "audio/mp4",
                ".wav" => "audio/wav",
                ".ogg" => "audio/ogg",
                ".oga" => "audio/ogg",
                _ => "application/octet-stream"
            };
        }

        private static string ResolveStoredFileName(int teamMemberId, string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            var stem = Path.GetFileNameWithoutExtension(fileName).ToLowerInvariant();

            if (stem.Contains("intro-audio", StringComparison.Ordinal))
                return $"{teamMemberId}-intro-audio{extension}";

            if (stem.Contains("intro-video", StringComparison.Ordinal))
                return $"{teamMemberId}-intro-video{extension}";

            return $"{teamMemberId}-intro-media{extension}";
        }
    }
}
