namespace OffsureManagementSystem.Infrastructure
{
    public class EmailSettings
    {
        public string ApiKey { get; set; } = string.Empty;
        public string From { get; set; } = "notify@offshoretechx.net";
        public string FromName { get; set; } = "Offshore TechX LLC";
        public string To { get; set; } = string.Empty;
        public string ApiUrl { get; set; } = "https://api.brevo.com/v3/smtp/email";
    }
}
