using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<ToolUsageLog> ToolUsageLogs => Set<ToolUsageLog>();
    public DbSet<ToolPurchase> ToolPurchases => Set<ToolPurchase>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        base.OnModelCreating(m);

        // ── Users ──────────────────────────────────────────────────────────────
        m.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(256).IsRequired();
            e.Property(u => u.Name).HasMaxLength(128).IsRequired();
        });

        // ── Plans ──────────────────────────────────────────────────────────────
        m.Entity<Plan>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Name).HasMaxLength(64).IsRequired();
            e.Property(p => p.PriceMonthly).HasColumnType("decimal(10,2)");
            e.Property(p => p.PricePerUse).HasColumnType("decimal(10,4)");

            // Seed default plans
            e.HasData(
                new Plan { Id = 1, Type = PlanType.Free,       Name = "Ücretsiz",  Description = "Her araç için ayda 3 kullanım", PriceMonthly = 0,    UsagePerToolPerMonth = 3  },
                new Plan { Id = 2, Type = PlanType.Standard,   Name = "Standart",  Description = "Tüm araçlarda ayda 10 kullanım", PriceMonthly = 199,  UsagePerToolPerMonth = 10 },
                new Plan { Id = 3, Type = PlanType.Premium,    Name = "Premium",   Description = "Tüm araçlarda ayda 25 kullanım", PriceMonthly = 399,  UsagePerToolPerMonth = 25 },
                new Plan { Id = 4, Type = PlanType.Enterprise, Name = "Kurumsal",  Description = "Kullandıkça öde",               PriceMonthly = 0,    UsagePerToolPerMonth = null, PricePerUse = 15 }
            );
        });

        // ── Subscriptions ──────────────────────────────────────────────────────
        m.Entity<Subscription>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasOne(s => s.User).WithOne(u => u.Subscription).HasForeignKey<Subscription>(s => s.UserId);
            e.HasOne(s => s.Plan).WithMany(p => p.Subscriptions).HasForeignKey(s => s.PlanId);
        });

        // ── ToolUsageLogs ──────────────────────────────────────────────────────
        m.Entity<ToolUsageLog>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasIndex(l => new { l.UserId, l.ToolId, l.UsedAt });
            e.HasOne(l => l.User).WithMany(u => u.UsageLogs).HasForeignKey(l => l.UserId);
            e.Property(l => l.ToolId).HasMaxLength(64).IsRequired();
        });

        // ── ToolPurchases ──────────────────────────────────────────────────────
        m.Entity<ToolPurchase>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasOne(p => p.User).WithMany(u => u.ToolPurchases).HasForeignKey(p => p.UserId);
            e.Property(p => p.ToolId).HasMaxLength(64).IsRequired();
            e.Property(p => p.AmountPaid).HasColumnType("decimal(10,2)");
        });
    }
}
