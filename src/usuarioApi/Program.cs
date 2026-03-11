using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using usuarioApi.Database;
using usuarioApi.Models;
using DotNetEnv;
var builder = WebApplication.CreateBuilder(args);

Env.Load();

builder.Services.AddOpenApi();

builder.Services.AddCors();

builder.Services.AddHttpClient();

builder.Services.AddControllers();

// database
//builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("database"));
var app = builder.Build();

app.UseCors(options =>
{
    options
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowAnyOrigin();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}


app.MapControllers();



using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if(!db.Usuarios.Any())
    {
        User usuario = new User()
        {
            Usuario = "admin",
            Senha = "admin"
        };

        db.Usuarios.Add(usuario);
    }
    db.SaveChanges();
}

app.Run();
