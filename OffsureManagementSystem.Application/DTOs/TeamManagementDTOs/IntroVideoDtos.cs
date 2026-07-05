namespace OffsureManagementSystem.Application.DTOs.TeamManagementDTOs
{
    public class IntroVideoSettingsDto
    {
        public int MaxDurationSeconds { get; set; }
        public int MaxFileSizeMb { get; set; }
        public IReadOnlyList<string> AcceptedFormats { get; set; } =
            new[] { "mp4", "webm", "mov", "mp3", "m4a", "wav", "ogg", "oga" };
    }
}
