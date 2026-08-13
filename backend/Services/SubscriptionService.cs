using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Services;

public class SubscriptionService(AppDbContext db)
{
    public async Task<List<Plan>> GetPlansAsync() =>
        await db.Plans.Where(p => p.IsActive).OrderBy(p => p.Id).ToListAsync();

    /// <summary>
    /// Kullanıcının aktif, süresi dolmamış aboneliğini döndürür.
    /// Süresi dolmuş abonelik null döndürür (ücretsiz plan gibi davranır).
    /// </summary>
    public async Task<Subscription?> GetUserSubscriptionAsync(Guid userId) =>
        await db.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId
                                   && s.Status == SubscriptionStatus.Active
                                   && (s.ExpiresAt == null || s.ExpiresAt > DateTime.UtcNow));

    /// <summary>
    /// Süresi dolmuş da dahil olmak üzere en son aboneliği döndürür (UI için — bitiş tarihi gösterimi).
    /// </summary>
    public async Task<Subscription?> GetLatestSubscriptionAsync(Guid userId) =>
        await db.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId);

    // Ödeme başarılıysa PayTR callback'ten çağrılır
    public async Task<Subscription> ActivateFromPaymentAsync(Guid userId, int planId, string? paymentId)
    {
        var sub = await UpgradeAsync(userId, planId);
        sub.IyzicoSubscriptionId = paymentId;
        await db.SaveChangesAsync();
        return sub;
    }

    public async Task<Subscription> UpgradeAsync(Guid userId, int planId)
    {
        var plan = await db.Plans.FindAsync(planId)
            ?? throw new InvalidOperationException("Plan not found");

        // Kullanıcı başına tek satır (unique constraint) — INSERT değil UPDATE
        var existing = await db.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (existing is not null)
        {
            existing.PlanId      = planId;
            existing.Status      = SubscriptionStatus.Active;
            existing.StartedAt   = DateTime.UtcNow;
            existing.ExpiresAt   = DateTime.UtcNow.AddMonths(1);
            existing.CancelledAt = null;
            // AutoRenew varsayılan olarak açık kalır — kullanıcı değiştirmemişse dokunma
            await db.SaveChangesAsync();
            existing.Plan = plan;
            return existing;
        }

        var newSub = new Subscription
        {
            UserId     = userId,
            PlanId     = planId,
            Status     = SubscriptionStatus.Active,
            StartedAt  = DateTime.UtcNow,
            ExpiresAt  = DateTime.UtcNow.AddMonths(1),
            AutoRenew  = true,
        };

        db.Subscriptions.Add(newSub);
        await db.SaveChangesAsync();

        newSub.Plan = plan;
        return newSub;
    }

    /// <summary>Otomatik yenileme tercihini günceller.</summary>
    public async Task<bool> SetAutoRenewAsync(Guid userId, bool autoRenew)
    {
        var sub = await db.Subscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
        if (sub is null) return false;

        sub.AutoRenew = autoRenew;
        await db.SaveChangesAsync();
        return true;
    }
}
