using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using KolayKobi.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public record ProfileResponse(string Name, string Email, string Company);

    public record UpdateProfileRequest(
        [Required, MaxLength(128)] string Name,
        [MaxLength(256)] string? Company);

    // ── GET /api/users/me/purchases ───────────────────────────────────────────
    [HttpGet("me/purchases")]
    public async Task<IActionResult> GetPurchases()
    {
        var purchases = await db.ToolPurchases
            .Where(p => p.UserId == CurrentUserId)
            .OrderByDescending(p => p.PurchasedAt)
            .ToListAsync();

        var data = purchases.Select(p => new
        {
            id          = p.Id,
            toolId      = p.ToolId,
            monthYear   = p.PurchasedAt.ToString("yyyy-MM"),
            totalRights = p.UsesGranted,
            usedCount   = p.UsesGranted - p.UsesRemaining,
            purchasedAt = p.PurchasedAt,
        });

        return Ok(new { success = true, data });
    }

    // ── GET /api/users/me/profile ──────────────────────────────────────────────
    [HttpGet("me/profile")]
    public async Task<IActionResult> GetProfile()
    {
        var user = await db.Users.FindAsync(CurrentUserId);
        if (user is null) return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        return Ok(new ProfileResponse(user.Name, user.Email, user.Company ?? string.Empty));
    }

    // ── PATCH /api/users/me/profile ───────────────────────────────────────────
    [HttpPatch("me/profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var user = await db.Users.FindAsync(CurrentUserId);
        if (user is null) return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        user.Name      = req.Name.Trim();
        user.Company   = req.Company?.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data    = new ProfileResponse(user.Name, user.Email, user.Company ?? string.Empty)
        });
    }
}
