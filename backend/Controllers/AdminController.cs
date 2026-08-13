using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using KolayKobi.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AppDbContext db, EmailService email) : ControllerBase
{
    // ── DTOs ─────────────────────────────────────────────────────────────────

    public record AdminUserDto(
        Guid Id,
        string Name,
        string Email,
        string Company,
        bool IsAdmin,
        bool IsActive,
        string PlanType,
        DateTime CreatedAt,
        DateTime? LastLoginAt,
        List<string> ToolsUsed,
        int TotalToolUses);

    public record UpdateUserRequest(
        [MaxLength(128)] string? Name,
        [MaxLength(256)] string? Company,
        bool? IsAdmin);

    public record CreateUserRequest(
        [Required, MaxLength(128)] string Name,
        [Required, EmailAddress, MaxLength(256)] string Email,
        [MaxLength(256)] string? Company,
        [Required, MinLength(8),
         RegularExpression(@"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$",
             ErrorMessage = "Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.")]
        string Password,
        bool IsAdmin = false,
        string Plan = "free",
        bool SendEmail = false);

    public record AdminResetPasswordRequest(
        [Required, MinLength(8),
         RegularExpression(@"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$",
             ErrorMessage = "Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.")]
        string NewPassword);

    // ── GET /api/admin/users ──────────────────────────────────────────────────
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await db.Users
            .Include(u => u.Subscription).ThenInclude(s => s!.Plan)
            .Include(u => u.UsageLogs)
            .OrderBy(u => u.CreatedAt)
            .ToListAsync();

        var data = users.Select(u => new AdminUserDto(
            u.Id,
            u.Name,
            u.Email,
            u.Company ?? string.Empty,
            u.IsAdmin,
            u.IsActive,
            u.Subscription?.Plan.Type.ToString().ToLower() ?? "free",
            u.CreatedAt,
            u.LastLoginAt,
            u.UsageLogs.Select(l => l.ToolId).Distinct().ToList(),
            u.UsageLogs.Count
        )).ToList();

        return Ok(new { success = true, data });
    }

    // ── PATCH /api/admin/users/{id} ───────────────────────────────────────────
    [HttpPatch("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        // Sadece mevcut admin'den yetki kaldırılıyorsa kontrol et
        if (req.IsAdmin.HasValue && !req.IsAdmin.Value && user.IsAdmin)
        {
            var callerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            if (id == callerId)
                return BadRequest(new { success = false, error = "Kendi admin yetkinizi kaldıramazsınız." });

            var adminCount = await db.Users.CountAsync(u => u.IsAdmin);
            if (adminCount <= 1)
                return BadRequest(new { success = false, error = "En az bir admin kalmalı." });
        }

        if (req.Name is not null) user.Name    = req.Name.Trim();
        if (req.Company is not null) user.Company = req.Company.Trim() == string.Empty ? null : req.Company.Trim();
        if (req.IsAdmin.HasValue)   user.IsAdmin  = req.IsAdmin.Value;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── POST /api/admin/users ─────────────────────────────────────────────────
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
            return Conflict(new { success = false, error = "Bu e-posta adresi zaten kayıtlı." });

        if (!Enum.TryParse<PlanType>(req.Plan, ignoreCase: true, out var planType))
            planType = PlanType.Free;

        var plan = await db.Plans.FirstOrDefaultAsync(p => p.Type == planType);
        if (plan is null)
            return BadRequest(new { success = false, error = "Geçersiz plan tipi." });

        var user = new User
        {
            Name          = req.Name.Trim(),
            Email         = req.Email.ToLower().Trim(),
            Company       = string.IsNullOrWhiteSpace(req.Company) ? null : req.Company.Trim(),
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword(req.Password),
            IsAdmin       = req.IsAdmin,
            EmailVerified = true,  // Admin tarafından oluşturulan → doğrulanmış sayılır
        };

        db.Users.Add(user);

        db.Subscriptions.Add(new Subscription
        {
            UserId = user.Id,
            PlanId = plan.Id,
            Status = SubscriptionStatus.Active,
        });

        await db.SaveChangesAsync();

        // Hoş geldiniz maili: yalnızca admin "Mail Gönder" kutusunu işaretlediyse gönderilir
        if (req.SendEmail)
        {
            var resetToken = Guid.NewGuid().ToString("N");
            user.PasswordResetToken  = resetToken;
            user.PasswordResetExpiry = DateTime.UtcNow.AddHours(24);
            await db.SaveChangesAsync();

            try
            {
                await email.SendWelcomeEmailAsync(user.Email, user.Name, resetToken);
            }
            catch (Exception ex)
            {
                // Mail hatası kullanıcı oluşturmayı geri almaz — loglayıp devam et
                Console.Error.WriteLine($"[AdminController] Welcome email failed for {user.Email}: {ex.Message}");
            }
        }

        return Ok(new { success = true, data = new { user.Id, user.Name, user.Email } });
    }

    // ── POST /api/admin/users/{id}/reset-password ─────────────────────────────
    [HttpPost("users/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] AdminResetPasswordRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        user.PasswordHash        = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.RefreshToken        = null;   // Mevcut oturumları sonlandır
        user.RefreshTokenExpiry  = null;
        user.UpdatedAt           = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── PATCH /api/admin/users/{id}/status ────────────────────────────────────
    [HttpPatch("users/{id:guid}/status")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var callerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == callerId)
            return BadRequest(new { success = false, error = "Kendi hesabınızı devre dışı bırakamazsınız." });

        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        user.IsActive  = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        // Pasif yapılıyorsa mevcut oturumları sonlandır
        if (!user.IsActive)
        {
            user.RefreshToken       = null;
            user.RefreshTokenExpiry = null;
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, isActive = user.IsActive });
    }

    // ── GET /api/admin/stats ──────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers        = await db.Users.CountAsync();
        var totalEvaluations  = await db.ToolUsageLogs.CountAsync();

        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var activeUsers = await db.ToolUsageLogs
            .Where(l => l.UsedAt >= thirtyDaysAgo)
            .Select(l => l.UserId)
            .Distinct()
            .CountAsync();

        var now          = DateTime.UtcNow;
        var sixMonthsAgo = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
                               .AddMonths(-5);

        // Monthly tool usage + active users
        var rawMonthly = await db.ToolUsageLogs
            .Where(l => l.UsedAt >= sixMonthsAgo)
            .GroupBy(l => new { l.UsedAt.Year, l.UsedAt.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                TotalUsed   = g.Count(),
                ActiveUsers = g.Select(l => l.UserId).Distinct().Count(),
            })
            .ToListAsync();

        // Monthly new registrations
        var rawRegistrations = await db.Users
            .Where(u => u.CreatedAt >= sixMonthsAgo)
            .GroupBy(u => new { u.CreatedAt.Year, u.CreatedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .ToListAsync();

        var monthlyStats = Enumerable.Range(0, 6).Select(i =>
        {
            var ms  = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-(5 - i));
            var row = rawMonthly.FirstOrDefault(m => m.Year == ms.Year && m.Month == ms.Month);
            var reg = rawRegistrations.FirstOrDefault(r => r.Year == ms.Year && r.Month == ms.Month);
            return new
            {
                monthYear          = ms.ToString("yyyy-MM"),
                totalUsed          = row?.TotalUsed   ?? 0,
                activeUsers        = row?.ActiveUsers  ?? 0,
                newRegistrations   = reg?.Count        ?? 0,
            };
        }).ToList();

        // Per-tool breakdown (all-time)
        var toolBreakdown = await db.ToolUsageLogs
            .GroupBy(l => l.ToolId)
            .Select(g => new { toolId = g.Key, totalUsed = g.Count() })
            .OrderByDescending(x => x.totalUsed)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new { totalUsers, totalEvaluations, activeUsers, monthlyStats, toolBreakdown }
        });
    }

    // ── GET /api/admin/users/{id}/usage-history ───────────────────────────────
    [HttpGet("users/{id:guid}/usage-history")]
    public async Task<IActionResult> GetUserUsageHistory(Guid id, [FromQuery] int months = 6)
    {
        var user = await db.Users
            .Include(u => u.Subscription).ThenInclude(s => s!.Plan)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user is null)
            return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        months = Math.Clamp(months, 1, 12);
        var now       = DateTime.UtcNow;
        var startDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
                            .AddMonths(-(months - 1));

        var usageByMonth = await db.ToolUsageLogs
            .Where(l => l.UserId == id && l.UsedAt >= startDate)
            .GroupBy(l => new { l.UsedAt.Year, l.UsedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .ToDictionaryAsync(x => (x.Year, x.Month), x => x.Count);

        const int toolCount  = 11;
        var limitPerTool     = user.IsAdmin ? (int?)null : user.Subscription?.Plan.UsagePerToolPerMonth;
        var totalLimit       = limitPerTool.HasValue ? limitPerTool.Value * toolCount : 0; // 0 = unlimited

        var history = Enumerable.Range(0, months).Select(i =>
        {
            var ms = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-(months - 1 - i));
            usageByMonth.TryGetValue((ms.Year, ms.Month), out var used);
            return new { monthYear = ms.ToString("yyyy-MM"), totalUsed = used, totalLimit };
        }).ToList();

        return Ok(new
        {
            success = true,
            data = new { user.Name, user.Email, history }
        });
    }

    // ── GET /api/admin/usage-log ──────────────────────────────────────────────
    // Detaylı kullanım logu: kişi + araç filtresi, paket + limit + rapor özeti dahil
    [HttpGet("usage-log")]
    public async Task<IActionResult> GetDetailedUsageLog(
        [FromQuery] Guid?   userId  = null,
        [FromQuery] string? toolId  = null,
        [FromQuery] int     limit   = 300)
    {
        limit = Math.Clamp(limit, 1, 500);

        IQueryable<ToolUsageLog> query = db.ToolUsageLogs
            .Include(l => l.User)
                .ThenInclude(u => u.Subscription)
                    .ThenInclude(s => s!.Plan);

        if (userId.HasValue)             query = query.Where(l => l.UserId == userId.Value);
        if (!string.IsNullOrEmpty(toolId)) query = query.Where(l => l.ToolId == toolId);

        var logs = await query
            .OrderByDescending(l => l.UsedAt)
            .Take(limit)
            .ToListAsync();

        // ToolResult'lardan inputSummary + id al (en yakın zamanlı eşleşme)
        var userIds = logs.Select(l => l.UserId).Distinct().ToList();
        var toolIds = logs.Select(l => l.ToolId).Distinct().ToList();

        var results = await db.ToolResults
            .Where(r => userIds.Contains(r.UserId) && toolIds.Contains(r.ToolId))
            .Select(r => new { r.Id, r.UserId, r.ToolId, r.InputSummary, r.CreatedAt })
            .ToListAsync();

        (string Summary, Guid? ResultId) FindResult(Guid uid, string tid, DateTime at)
        {
            var match = results
                .Where(r => r.UserId == uid && r.ToolId == tid)
                .OrderBy(r => Math.Abs((r.CreatedAt - at).TotalSeconds))
                .FirstOrDefault();
            return (match?.InputSummary ?? string.Empty, match?.Id);
        }

        // Snapshot alanları kayıt anında saklandı — dinamik hesaplamaya gerek yok
        var data = logs.Select(l =>
        {
            var currentPlan = l.User.Subscription?.Plan;
            var (summary, resultId) = FindResult(l.UserId, l.ToolId, l.UsedAt);
            return new
            {
                id               = l.Id,
                userId           = l.UserId,
                userName         = l.User.Name,
                userEmail        = l.User.Email,
                toolId           = l.ToolId,
                usedAt           = l.UsedAt,
                success          = l.Success,
                inputSummary     = summary,
                toolResultId     = resultId,                     // rapor detay sayfası için
                // Kayıt anındaki snapshot değerleri
                planNameAtTime   = string.IsNullOrEmpty(l.PlanNameAtTime)
                                       ? (currentPlan?.Name ?? "Ücretsiz")
                                       : l.PlanNameAtTime,
                planType         = currentPlan?.Type.ToString().ToLower() ?? "free",
                usageCountBefore = l.UsageCountBefore,
                usageCountAfter  = l.Success ? l.UsageCountBefore + 1 : l.UsageCountBefore,
                limitAtTime      = l.LimitAtTime,
            };
        }).ToList();

        // Filtre dropdown'ı için kullanıcı listesi
        var users = logs
            .Select(l => new { id = l.UserId, name = l.User.Name, email = l.User.Email })
            .DistinctBy(u => u.id)
            .OrderBy(u => u.name)
            .ToList();

        return Ok(new { success = true, data, meta = new { users } });
    }

    // ── DELETE /api/admin/users/{id} ──────────────────────────────────────────
    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var callerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == callerId)
            return BadRequest(new { success = false, error = "Kendi hesabınızı silemezsiniz." });

        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        db.Users.Remove(user);   // Cascade: Subscription + UsageLogs + ToolPurchases silinir
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── GET /api/admin/results/{id} ──────────────────────────────────────────
    // Admin herhangi bir kullanıcının ToolResult'ını okuyabilir
    [HttpGet("results/{id:guid}")]
    public async Task<IActionResult> GetResult(Guid id)
    {
        var result = await db.ToolResults
            .Include(r => r.User)
            .Where(r => r.Id == id)
            .Select(r => new { r.Id, r.ToolId, r.InputSummary, r.OutputJson, r.CreatedAt, r.UserId, r.User.Name, r.User.Email })
            .FirstOrDefaultAsync();

        if (result is null)
            return NotFound(new { success = false, error = "Kayıt bulunamadı." });

        return Ok(new { success = true, data = result });
    }

    // ── GET /api/admin/plans ──────────────────────────────────────────────────
    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await db.Plans.OrderBy(p => p.Id).ToListAsync();
        var data = plans.Select(p => new
        {
            p.Id,
            p.Type,
            p.Name,
            p.Description,
            p.PriceMonthly,
            p.UsagePerToolPerMonth,
            p.PricePerUse,
            p.IsActive,
            p.PeriodType,
            p.PeriodDays,
            p.PeriodStartDate,
            p.PeriodEndDate,
        });
        return Ok(new { success = true, data });
    }

    // ── PUT /api/admin/plans/{id} ─────────────────────────────────────────────
    public record UpdatePlanRequest(
        [MaxLength(64)] string Name,
        [MaxLength(256)] string Description,
        decimal PriceMonthly,
        int? UsageLimit,
        decimal? PricePerUse,
        PeriodType PeriodType,
        int? PeriodDays,
        DateTime? PeriodStartDate,
        DateTime? PeriodEndDate);

    [HttpPut("plans/{id}")]
    public async Task<IActionResult> UpdatePlan(int id, [FromBody] UpdatePlanRequest req)
    {
        var plan = await db.Plans.FindAsync(id);
        if (plan is null)
            return NotFound(new { success = false, error = "Paket bulunamadı." });

        plan.Name                 = req.Name.Trim();
        plan.Description          = req.Description.Trim();
        plan.PriceMonthly         = req.PriceMonthly;
        plan.UsagePerToolPerMonth = req.UsageLimit;
        plan.PricePerUse          = req.PricePerUse;
        plan.PeriodType           = req.PeriodType;
        plan.PeriodDays           = req.PeriodDays;
        plan.PeriodStartDate      = req.PeriodStartDate?.ToUniversalTime();
        plan.PeriodEndDate        = req.PeriodEndDate?.ToUniversalTime();

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── GET /api/admin/tool-prices ────────────────────────────────────────────
    [HttpGet("tool-prices")]
    public async Task<IActionResult> GetToolPrices()
    {
        var prices = await db.ToolPrices
            .OrderBy(p => p.Id)
            .Select(p => new
            {
                p.Id,
                p.ToolId,
                p.ToolName,
                p.PriceMonthly,
                p.IsActive,
                p.UpdatedAt,
            })
            .ToListAsync();

        return Ok(new { success = true, data = prices });
    }

    // ── PUT /api/admin/tool-prices/{id} ──────────────────────────────────────
    [HttpPut("tool-prices/{id:int}")]
    public async Task<IActionResult> UpdateToolPrice(int id, [FromBody] UpdateToolPriceRequest req)
    {
        var toolPrice = await db.ToolPrices.FindAsync(id);
        if (toolPrice is null)
            return NotFound(new { error = "Araç fiyatı bulunamadı." });

        toolPrice.PriceMonthly = req.PriceMonthly;
        toolPrice.IsActive     = req.IsActive;
        toolPrice.UpdatedAt    = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    public record UpdateToolPriceRequest(
        [Range(0, 9999.99)] decimal PriceMonthly,
        bool IsActive);

    // ── PUT /api/admin/users/{userId}/subscription ────────────────────────────
    // Admin: herhangi bir kullanıcının aboneliğini direkt değiştirir (test/destek için).
    // action: "set" → planId ile aktive et | "expire" → süresi dolmuş say | "free" → ücretsiz plana al

    [HttpPut("users/{userId:guid}/subscription")]
    public async Task<IActionResult> UpdateUserSubscription(
        Guid userId,
        [FromBody] UpdateUserSubscriptionRequest req)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return NotFound(new { error = "Kullanıcı bulunamadı." });

        var sub = await db.Subscriptions.FirstOrDefaultAsync(s => s.UserId == userId);

        if (req.Action == "free" || req.Action == "expire")
        {
            if (sub is not null)
            {
                if (req.Action == "expire")
                {
                    // Süresi dünden itibaren dolmuş say
                    sub.ExpiresAt = DateTime.UtcNow.AddDays(-1);
                }
                else // free
                {
                    var freePlan = await db.Plans.FirstOrDefaultAsync(p => p.Type == PlanType.Free);
                    if (freePlan is null)
                        return StatusCode(500, new { error = "Ücretsiz plan bulunamadı." });

                    sub.PlanId      = freePlan.Id;
                    sub.Status      = SubscriptionStatus.Active;
                    sub.StartedAt   = DateTime.UtcNow;
                    sub.ExpiresAt   = null;
                    sub.CancelledAt = null;
                }
                await db.SaveChangesAsync();
            }
            return Ok(new { success = true, action = req.Action });
        }

        // action == "set" — belirtilen plan ile aktive et
        if (req.PlanId is null)
            return BadRequest(new { error = "planId gerekli." });

        var plan = await db.Plans.FindAsync(req.PlanId.Value);
        if (plan is null)
            return NotFound(new { error = "Plan bulunamadı." });

        if (sub is not null)
        {
            sub.PlanId      = plan.Id;
            sub.Status      = SubscriptionStatus.Active;
            sub.StartedAt   = DateTime.UtcNow;
            sub.ExpiresAt   = plan.Type == PlanType.Free ? null : DateTime.UtcNow.AddMonths(1);
            sub.CancelledAt = null;
        }
        else
        {
            sub = new Subscription
            {
                UserId    = userId,
                PlanId    = plan.Id,
                Status    = SubscriptionStatus.Active,
                StartedAt = DateTime.UtcNow,
                ExpiresAt = plan.Type == PlanType.Free ? null : DateTime.UtcNow.AddMonths(1),
            };
            db.Subscriptions.Add(sub);
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, plan = plan.Name, expiresAt = sub.ExpiresAt });
    }

    public record UpdateUserSubscriptionRequest(
        string Action,    // "set" | "free" | "expire"
        int? PlanId);
}
