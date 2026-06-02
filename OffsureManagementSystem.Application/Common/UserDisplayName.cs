using OffshoreManagementSystem.Domain.Entities;

namespace OffsureManagementSystem.Application.Common
{
    public static class UserDisplayName
    {
        public static string Build(string? firstName, string? lastName)
            => $"{firstName?.Trim()} {lastName?.Trim()}".Trim();

        public static string FromUser(User? user)
            => user is null ? string.Empty : Build(user.FirstName, user.LastName);

        public static string FromTeamMember(TeamMember? member)
            => FromUser(member?.User);
    }
}
