using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KolayKobi.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddToolResults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ToolResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToolId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    InputSummary = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OutputJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ToolResults_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ToolResults_UserId_CreatedAt",
                table: "ToolResults",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ToolResults");
        }
    }
}
