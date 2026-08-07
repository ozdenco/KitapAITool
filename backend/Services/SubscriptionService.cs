using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Services;

public class SubscriptionService(AppDbContext db)
{
    public async Task<List<Plan>> GetPlansAsync() =>
        await db.Plans.Where(p => p.IsActive).OrderBy(p => p.Id).ToListAsync();

    public async Task<Subscription?> GetUserSubscriptionAsync(Guid userId) =>
        await db.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == SubscriptionStatus.Active);

    public async Task<Subscription> UpgradeAsync(Guid userId, int planId)
    {
        var plan = await db.Plans.FindAsync(planId)
            ?? throw new InvalidOperationException("Plan not found");

        var existing = await db.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == SubscriptionStatus.Active);

        if (existing is not null)
        {
            existing.Status = SubscriptionStatus.Cancelled;
            existing.CancelledAt = DateTime.UtcNow;
        }

        var newSub = new Subscription
        {
            UserId = userId,
            PlanId = planId,
            Status = SubscriptionStatus.Active,
            StartedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMonths(1)
        };

        db.Subscriptions.Add(newSub);
        await db.SaveChangesAsync();

        newSub.Plan = plan;
        return newSub;
    }
}
