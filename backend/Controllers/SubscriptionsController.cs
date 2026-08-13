using System.Security.Claims;
using KolayKobi.Api.Data;
using KolayKobi.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KolayKobi.Api.Controllers;

[ApiController]
[Route("api/subscriptions")]
[Authorize]
public class SubscriptionsController(SubscriptionService subs) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);

    // ── GET /api/subscriptions/plans ─────────────────────────────────────────

    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await subs.GetPlansAsync();
        return Ok(plans.Select(p => new
        {
            p.Id,
            type        = p.Type.ToString().ToLower(),
            p.Name,
            p.Description,
            p.PriceMonthly,
            p.UsagePerToolPerMonth,
            p.PricePerUse
        }));
    }

    // ── GET /api/subscriptions/me ─────────────────────────────────────────────
    // Aktif (süresi dolmamış) abonelik varsa döndürür.
    // Süresi dolmuşsa: status="expired", plan="free" (ücretsiz limit uygulanır).

    [HttpGet("me")]
    public async Task<IActionResult> GetMine()
    {
        // Aktif (süresi dolmamış) abonelik
        var activeSub = await subs.GetUserSubscriptionAsync(CurrentUserId);
        if (activeSub is not null)
        {
            return Ok(new
            {
                id                   = activeSub.Id,
                plan                 = activeSub.Plan.Type.ToString().ToLower(),
                planName             = activeSub.Plan.Name,
                status               = activeSub.Status.ToString().ToLower(),
                startedAt            = activeSub.StartedAt,
                expiresAt            = activeSub.ExpiresAt,
                usagePerToolPerMonth = activeSub.Plan.UsagePerToolPerMonth,
                autoRenew            = activeSub.AutoRenew,
            });
        }

        // Süresi dolmuş abonelik var mı? (UI için expiry tarihini göstermek için)
        var latestSub = await subs.GetLatestSubscriptionAsync(CurrentUserId);
        if (latestSub is not null && latestSub.ExpiresAt.HasValue && latestSub.ExpiresAt < DateTime.UtcNow)
        {
            return Ok(new
            {
                id                   = latestSub.Id,
                plan                 = "free",                  // ücretsiz plana düştü
                planName             = "Ücretsiz",
                status               = "expired",               // süresi doldu
                previousPlan         = latestSub.Plan?.Name,   // hangi paketi kullanıyordu
                startedAt            = latestSub.StartedAt,
                expiresAt            = latestSub.ExpiresAt,     // ne zaman bitti
                usagePerToolPerMonth = 3,                        // ücretsiz plan limiti
                autoRenew            = latestSub.AutoRenew,
            });
        }

        // Hiç abonelik yoksa — ücretsiz plan
        return Ok(new
        {
            plan                 = "free",
            planName             = "Ücretsiz",
            status               = "active",
            usagePerToolPerMonth = 3,
            autoRenew            = false,
        });
    }

    // ── PUT /api/subscriptions/me/auto-renew ─────────────────────────────────

    [HttpPut("me/auto-renew")]
    public async Task<IActionResult> SetAutoRenew([FromBody] SetAutoRenewRequest req)
    {
        var updated = await subs.SetAutoRenewAsync(CurrentUserId, req.AutoRenew);
        if (!updated)
            return NotFound(new { error = "Abonelik bulunamadı." });

        return Ok(new { success = true, autoRenew = req.AutoRenew });
    }

    // ── POST /api/subscriptions/upgrade ──────────────────────────────────────

    [HttpPost("upgrade")]
    public async Task<IActionResult> Upgrade([FromBody] UpgradeRequest req)
    {
        try
        {
            var sub = await subs.UpgradeAsync(CurrentUserId, req.PlanId);
            return Ok(new
            {
                id        = sub.Id,
                plan      = sub.Plan.Type.ToString().ToLower(),
                planName  = sub.Plan.Name,
                status    = sub.Status.ToString().ToLower(),
                startedAt = sub.StartedAt,
                expiresAt = sub.ExpiresAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    public record UpgradeRequest(int PlanId);
    public record SetAutoRenewRequest(bool AutoRenew);
}
