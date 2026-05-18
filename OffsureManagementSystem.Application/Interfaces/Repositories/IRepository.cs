using OffshoreManagementSystem.Domain.BaseEntity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Application.Interfaces.IRepository
{
    public interface IRepository<TEntity> where TEntity : BaseEntity
    {
        IQueryable<TEntity> GetAll(Expression<Func<TEntity, bool>> expression = null);
        Task<TEntity> GetByIDAsync(int id);

        Task AddAsync(TEntity entity);
        Task AddRangeAsync(IEnumerable<TEntity> entities);

        void SaveInclude(TEntity entity, params string[] properties);
        IQueryable<TEntity> Query();
        void SoftDelete(TEntity entity);
        void HardDelete(TEntity entity);

        void DeleteRange(IEnumerable<TEntity> entities);
        Task DeleteAsync(TEntity entity);

        Task<bool> IsExistAsync(int id);
        Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate);


        Task SaveChangesAsync();

    }
}
