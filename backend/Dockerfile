# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS builder
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

# Runtime stage — Debian tabanlı (Alpine musl SSL stack TLS sorunları yaşıyor)
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=builder /app .
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000
ENTRYPOINT ["dotnet", "KolayKobi.Api.dll"]
