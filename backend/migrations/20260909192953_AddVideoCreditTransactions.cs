using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KolayKobi.Api.migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Video kredisi defteri (VideoCreditTransactions).
    ///
    /// NOT: EF ayrıca ToolPrices.UpdatedAt seed damgalarını yeniden yazan
    /// UpdateData komutları üretti. Seed DateTime.UtcNow kullandığı için her
    /// migration'da değişiyorlar; uygulanmaları admin panelindeki gerçek
    /// "son güncelleme" bilgisini silerdi. Önceki migration'da olduğu gibi
    /// elle çıkarıldı.
    /// </summary>
    public partial class AddVideoCreditTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VideoCreditTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Delta = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    RefId = table.Column<string>(type: "text", nullable: true),
                    Aciklama = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoCreditTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VideoCreditTransactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });












            migrationBuilder.CreateIndex(
                name: "IX_VideoCreditTransactions_UserId_CreatedAt",
                table: "VideoCreditTransactions",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_VideoCreditTransactions_UserId_Reason",
                table: "VideoCreditTransactions",
                columns: new[] { "UserId", "Reason" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VideoCreditTransactions");











        }
    }
}
