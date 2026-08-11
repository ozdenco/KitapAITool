using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KolayKobi.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanPeriodFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PeriodDays",
                table: "Plans",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PeriodEndDate",
                table: "Plans",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PeriodStartDate",
                table: "Plans",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PeriodType",
                table: "Plans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "PeriodDays", "PeriodEndDate", "PeriodStartDate", "PeriodType" },
                values: new object[] { null, null, null, 0 });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "PeriodDays", "PeriodEndDate", "PeriodStartDate", "PeriodType" },
                values: new object[] { null, null, null, 0 });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "PeriodDays", "PeriodEndDate", "PeriodStartDate", "PeriodType" },
                values: new object[] { null, null, null, 0 });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "PeriodDays", "PeriodEndDate", "PeriodStartDate", "PeriodType" },
                values: new object[] { null, null, null, 0 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PeriodDays",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "PeriodEndDate",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "PeriodStartDate",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "PeriodType",
                table: "Plans");
        }
    }
}
