using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Services;

public class UserService(AppDbContext db, TokenService tokens)
{
    public async Task<(User user, string accessToken, string refreshToken)?> RegisterAsync(
        string name, string email, string password)
    {
        if (await db.Users.AnyAsync(u => u.Email == email.ToLower()))
            return null;

        var user = new User
        {
            Name = name,
            Email = email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        };

        // Create free subscription
        var freePlan = await db.Plans.FirstAsync(p => p.Type == PlanType.Free);
        var subscription = new Subscription
        {
            UserId = user.Id,
            PlanId = freePlan.Id,
            Status = SubscriptionStatus.Active
        };

        db.Users.Add(user);
        db.Subscriptions.Add(subscription);

        var refreshToken = tokens.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = tokens.RefreshTokenExpiry;

        await db.SaveChangesAsync();

        return (user, tokens.GenerateAccessToken(user), refreshToken);
    }

    public async Task<(User user, string accessToken, string refreshToken)?> LoginAsync(
        string email, string password)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLower());
        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        var refreshToken = tokens.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = tokens.RefreshTokenExpiry;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return (user, tokens.GenerateAccessToken(user), refreshToken);
    }

    public async Task<(User user, string accessToken, string refreshToken)?> RefreshAsync(
        string accessToken, string refreshToken)
    {
        var userId = tokens.GetUserIdFromExpiredToken(accessToken);
        if (userId is null) return null;

        var user = await db.Users.FindAsync(userId);
        if (user is null
            || user.RefreshToken != refreshToken
            || user.RefreshTokenExpiry < DateTime.UtcNow)
            return null;

        var newRefresh = tokens.GenerateRefreshToken();
        user.RefreshToken = newRefresh;
        user.RefreshTokenExpiry = tokens.RefreshTokenExpiry;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return (user, tokens.GenerateAccessToken(user), newRefresh);
    }

    public async Task<User?> GetByIdAsync(Guid id) =>
        await db.Users.Include(u => u.Subscription)
                       .ThenInclude(s => s!.Plan)
                       .FirstOrDefaultAsync(u => u.Id == id);

    public async Task LogoutAsync(Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return;
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
}
