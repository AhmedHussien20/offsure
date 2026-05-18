using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace TaskMangment.Application.Common.Responses
{
    public class PagedResponse<T>
    {
        public ICollection<T> Data { get; set; }
        public int TotalCount { get; set; }
        public int PageIndex { get; set; }
        public int PageSize { get; set; }
        public PagedResponse(ICollection<T> data, int totalCount, int pageIndex, int pageSize)
        {
            Data = data;
            TotalCount = totalCount;
            PageIndex = pageIndex;
            PageSize = pageSize;
        }
    }

}
