using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AppDbContext db) : ControllerBase
{
    // ── DTOs ─────────────────────────────────────────────────────────────────

    public record AdminUserDto(
        Guid Id,
        string Name,
        string Email,
        string Company,
        bool IsAdmin,
        string PlanType,
        DateTime CreatedAt,
        DateTime? LastLoginAt,
        List<string> ToolsUsed,
        int TotalToolUses);

    public record UpdateUserRequest(
        [MaxLength(128)] string? Name,
        [MaxLength(256)] string? Company,
        bool? IsAdmin);

    public record AdminResetPasswordRequest(
        [Required, MinLength(8)] string NewPassword);

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

        // Kendisinden adminliği kaldırma — en az bir admin kalsın
        if (req.IsAdmin.HasValue && !req.IsAdmin.Value)
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
}
