using System.Text.RegularExpressions;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.TimesheetDTOs;

namespace OffsureManagementSystem.Application.Common
{
    public static class TimesheetTimeHelper
    {
        private static readonly Regex TimePattern = new(
            @"^(\d{1,2}):(\d{2})$",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        public static bool TryParseTime(string? value, out int minutes)
        {
            minutes = 0;
            if (string.IsNullOrWhiteSpace(value))
                return false;

            var match = TimePattern.Match(value.Trim());
            if (!match.Success)
                return false;

            if (!int.TryParse(match.Groups[1].Value, out var hours))
                return false;

            if (!int.TryParse(match.Groups[2].Value, out var mins))
                return false;

            if (hours is < 0 or > 23 || mins is < 0 or > 59)
                return false;

            if (mins % 10 != 0)
                return false;

            minutes = hours * 60 + mins;
            return true;
        }

        public static string FormatTime(int minutes)
        {
            var h = minutes / 60;
            var m = minutes % 60;
            return $"{h:D2}:{m:D2}";
        }

        public static decimal CalculateHours(int startMinutes, int endMinutes)
            => Math.Round((endMinutes - startMinutes) / 60m, 2, MidpointRounding.AwayFromZero);

        public static void ValidateEntryTimes(int startMinutes, int endMinutes)
        {
            if (startMinutes % 10 != 0 || endMinutes % 10 != 0)
                throw new AppException("Times must use 10-minute increments (00, 10, 20, …, 50).", 400);

            if (endMinutes <= startMinutes)
                throw new AppException("End time must be after start time.", 400);
        }

        public static void ValidateNoOverlaps(IReadOnlyList<(int Start, int End)> entries)
        {
            var ordered = entries.OrderBy(e => e.Start).ToList();
            for (var i = 1; i < ordered.Count; i++)
            {
                if (ordered[i].Start < ordered[i - 1].End)
                    throw new AppException("Time entries on the same day cannot overlap.", 400);
            }
        }

        public static decimal SumHours(IEnumerable<(int Start, int End)> entries)
            => entries.Sum(e => CalculateHours(e.Start, e.End));

        public static (DateOnly Start, DateOnly End) ResolveReportRange(
            TimesheetReportPeriod period,
            DateOnly projectStart,
            DateOnly today)
        {
            return period switch
            {
                TimesheetReportPeriod.Week => ResolveWeekRange(today),
                TimesheetReportPeriod.Month => (
                    new DateOnly(today.Year, today.Month, 1),
                    new DateOnly(today.Year, today.Month, DateTime.DaysInMonth(today.Year, today.Month))),
                _ => (projectStart, today)
            };
        }

        private static (DateOnly Start, DateOnly End) ResolveWeekRange(DateOnly today)
        {
            // Work week runs Saturday through Friday.
            var dayOfWeek = (int)today.DayOfWeek;
            var daysSinceSaturday = (dayOfWeek - (int)DayOfWeek.Saturday + 7) % 7;
            var saturday = today.AddDays(-daysSinceSaturday);
            return (saturday, saturday.AddDays(6));
        }
    }
}
