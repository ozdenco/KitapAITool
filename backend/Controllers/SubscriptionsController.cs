using System.Security.Claims;
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
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>GET /api/subscriptions/plans — Public plan listing.</summary>
    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await subs.GetPlansAsync();
        return Ok(plans.Select(p => new
        {
            p.Id,
            type = p.Type.ToString().ToLower(),
            p.Name,
            p.Description,
            p.PriceMonthly,
            p.UsagePerToolPerMonth,
            p.PricePerUse
        }));
    }

    /// <summary>GET /api/subscriptions/me — Current user subscription.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMine()
    {
        var sub = await subs.GetUserSubscriptionAsync(CurrentUserId);
        if (sub is null)
            return Ok(new { plan = "free", status = "active" });

        return Ok(new
        {
            id = sub.Id,
            plan = sub.Plan.Type.ToString().ToLower(),
            planName = sub.Plan.Name,
            status = sub.Status.ToString().ToLower(),
            startedAt = sub.StartedAt,
            expiresAt = sub.ExpiresAt,
            usagePerToolPerMonth = sub.Plan.UsagePerToolPerMonth
        });
    }

    /// <summary>POST /api/subscriptions/upgrade — Upgrade to a paid plan.</summary>
    [HttpPost("upgrade")]
    public async Task<IActionResult> Upgrade([FromBody] UpgradeRequest req)
    {
        try
        {
            var sub = await subs.UpgradeAsync(CurrentUserId, req.PlanId);
            return Ok(new
            {
                id = sub.Id,
                plan = sub.Plan.Type.ToString().ToLower(),
                planName = sub.Plan.Name,
                status = sub.Status.ToString().ToLower(),
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
}
