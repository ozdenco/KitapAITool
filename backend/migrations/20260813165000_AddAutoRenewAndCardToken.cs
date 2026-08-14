using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KolayKobi.Api.migrations
{
    /// <inheritdoc />
    public partial class AddAutoRenewAndCardToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Araç satın alımı otomatik yenileme (varsayılan: açık)
            migrationBuilder.AddColumn<bool>(
                name: "AutoRenew",
                table: "ToolPurchases",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            // PayTR kayıtlı kart tokenı (otomatik yenileme için)
            migrationBuilder.AddColumn<string>(
                name: "PayTrCardToken",
                table: "Users",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoRenew",
                table: "ToolPurchases");

            migrationBuilder.DropColumn(
                name: "PayTrCardToken",
                table: "Users");
        }
    }
}
