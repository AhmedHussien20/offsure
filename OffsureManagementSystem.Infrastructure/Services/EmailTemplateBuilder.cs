using System.Net;
using OffsureManagementSystem.Application.Common;

namespace OffsureManagementSystem.Infrastructure.Services
{
    /// <summary>
    /// Formal transactional email layout — letter-style, minimal chrome.
    /// </summary>
    internal static class EmailTemplateBuilder
    {
        private const string TextPrimary = "#1a1a1a";
        private const string TextMuted = "#555555";
        private const string Accent = "#0f4c81";
        private const string Rule = "#d0d0d0";

        public static string Wrap(
            string title,
            string contentHtml,
            string? ctaLabel = null,
            string? ctaUrl = null)
        {
            var brand = WebUtility.HtmlEncode(BrandingConstants.ServiceProviderName);
            var safeTitle = WebUtility.HtmlEncode(title);
            var year = DateTime.UtcNow.Year;

            var ctaBlock = string.Empty;
            if (!string.IsNullOrWhiteSpace(ctaLabel) && !string.IsNullOrWhiteSpace(ctaUrl))
            {
                var safeLabel = WebUtility.HtmlEncode(ctaLabel);
                var isMailto = ctaUrl.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase);
                var copyHint = isMailto
                    ? string.Empty
                    : $@"
<p style=""margin:0 0 12px 0;font-size:12px;line-height:1.4;color:{TextMuted};word-break:break-all;"">
  Or copy this link into your browser:<br/>
  <a href=""{ctaUrl}"" style=""color:{TextMuted};text-decoration:none;"">{WebUtility.HtmlEncode(ctaUrl)}</a>
</p>";

                ctaBlock = $@"
<p style=""margin:16px 0 8px 0;"">
  <a href=""{ctaUrl}"" style=""color:{Accent};font-weight:600;text-decoration:underline;"">{safeLabel}</a>
</p>
{copyHint}";
            }

            return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>{safeTitle}</title>
</head>
<body style=""margin:0;padding:0;background:#ffffff;"">
  <div style=""max-width:560px;margin:0 auto;padding:24px 20px;font-family:Georgia,'Times New Roman',Times,serif;color:{TextPrimary};font-size:15px;line-height:1.5;"">
    <p style=""margin:0 0 2px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:{Accent};"">
      {brand}
    </p>
    <h1 style=""margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:600;line-height:1.3;color:{TextPrimary};"">
      {safeTitle}
    </h1>
    <hr style=""border:none;border-top:1px solid {Rule};margin:12px 0 14px 0;"" />

    {contentHtml}
    {ctaBlock}

    <p style=""margin:18px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:{TextMuted};"">
      {brand} · © {year}
    </p>
  </div>
</body>
</html>";
        }

        public static string P(string html) =>
            $@"<p style=""margin:0 0 10px 0;"">{html}</p>";

        public static string Note(string html) =>
            $@"<p style=""margin:0 0 8px 0;font-size:13px;color:{TextMuted};"">{html}</p>";

        public static string Line(string label, string valueHtml) =>
            $@"<p style=""margin:0 0 4px 0;line-height:1.4;""><span style=""font-family:Arial,Helvetica,sans-serif;font-size:12px;color:{TextMuted};"">{WebUtility.HtmlEncode(label)}:</span> {valueHtml}</p>";

        public static string BuildMailtoUrl(string email, string subject, string body)
        {
            var encodedSubject = Uri.EscapeDataString(subject);
            var encodedBody = Uri.EscapeDataString(body);
            return $"mailto:{email.Trim()}?subject={encodedSubject}&body={encodedBody}";
        }
    }
}
