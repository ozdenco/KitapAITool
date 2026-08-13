using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KolayKobi.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddToolUsageLogSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LimitAtTime",
                table: "ToolUsageLogs",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlanNameAtTime",
                table: "ToolUsageLogs",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UsageCountBefore",
                table: "ToolUsageLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LimitAtTime",
                table: "ToolUsageLogs");

            migrationBuilder.DropColumn(
                name: "PlanNameAtTime",
                table: "ToolUsageLogs");

            migrationBuilder.DropColumn(
                name: "UsageCountBefore",
                table: "ToolUsageLogs");
        }
    }
}
