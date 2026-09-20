using Microsoft.Extensions.Options;
using OffsureManagementSystem.Application.Interfaces.Services;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly EmailSettings _settings;
        private readonly IHttpClientFactory _httpClientFactory;

        public EmailService(IOptions<EmailSettings> settings, IHttpClientFactory httpClientFactory)
        {
            _settings = settings.Value;
            _httpClientFactory = httpClientFactory;
        }

        public async Task SendEmailAsync(
            string to,
            string subject,
            string body,
            string? replyToEmail = null,
            string? replyToName = null)
        {
            if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                throw new InvalidOperationException("Brevo API key is not configured (EmailSettings:ApiKey).");
            }

            var client = _httpClientFactory.CreateClient();

            using var request = new HttpRequestMessage(HttpMethod.Post, _settings.ApiUrl);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            request.Headers.Add("api-key", _settings.ApiKey);

            var payload = new Dictionary<string, object?>
            {
                ["sender"] = new
                {
                    name = string.IsNullOrWhiteSpace(_settings.FromName)
                        ? _settings.From
                        : _settings.FromName,
                    email = _settings.From
                },
                ["to"] = new[]
                {
                    new { email = to }
                },
                ["subject"] = subject,
                ["htmlContent"] = body
            };

            if (!string.IsNullOrWhiteSpace(replyToEmail))
            {
                payload["replyTo"] = new
                {
                    email = replyToEmail.Trim(),
                    name = string.IsNullOrWhiteSpace(replyToName)
                        ? replyToEmail.Trim()
                        : replyToName.Trim()
                };
            }

            request.Content = new StringContent(
                JsonSerializer.Serialize(payload, JsonOptions),
                Encoding.UTF8,
                "application/json");

            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException(
                    $"Failed to send email via Brevo ({(int)response.StatusCode}): {error}");
            }
        }
    }
}
