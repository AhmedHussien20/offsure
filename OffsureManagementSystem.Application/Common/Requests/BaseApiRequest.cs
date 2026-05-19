namespace OffsureManagementSystem.Application.Common.Requests
{
    public class BaseApiRequest
    {
        public int? Id { get; set; }
        public string? searchKey { get; set; }
        public int PageIndex { get; set; } = 1;

        private int _pageSize = 20;
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value > 100 ? 100 : value;
        }

        public string SortColumn { get; set; } = "Id";
        public string SortDirection { get; set; } = "DESC";
        public bool BypassCache { get; set; } = false;
    }
}
