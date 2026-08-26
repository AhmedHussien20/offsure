using OffshoreManagementSystem.Domain.Entities;

namespace OffsureManagementSystem.Application.Common
{
    /// <summary>
    /// Soft-delete helpers that free login credentials so a new account can reuse the same email.
    /// </summary>
    public static class UserAccountLifecycle
    {
        public const int EmailMaxLength = 256;

        /// <summary>
        /// Soft-deletes the user, clears auth tokens, and releases the email for reuse.
        /// </summary>
        public static void SoftDeleteUserAccount(User user)
        {
            if (user.IsDeleted)
                return;

            user.IsActive = false;
            user.IsDeleted = true;
            user.DeletedAt = DateTime.UtcNow;
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpiry = null;
            user.EmailVerificationToken = null;
            user.EmailVerificationExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;
            user.Email = BuildReleasedEmail(user.Id, user.Email);
        }

        /// <summary>
        /// Builds a unique tombstone email so soft-deleted rows never block active uniqueness.
        /// </summary>
        public static string BuildReleasedEmail(int userId, string? email)
        {
            var marker = $".deleted.{userId}";
            var normalized = (email ?? string.Empty).Trim();

            if (normalized.Contains(".deleted.", StringComparison.OrdinalIgnoreCase))
                return Truncate(normalized);

            var maxBase = EmailMaxLength - marker.Length;
            if (maxBase < 1)
                return Truncate($"deleted.{userId}");

            var baseEmail = normalized.Length <= maxBase
                ? normalized
                : normalized.Substring(0, maxBase);

            if (string.IsNullOrWhiteSpace(baseEmail))
                baseEmail = $"user{userId}";

            return baseEmail + marker;
        }

        private static string Truncate(string value)
            => value.Length <= EmailMaxLength ? value : value.Substring(0, EmailMaxLength);
    }
}
