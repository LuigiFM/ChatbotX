using Microsoft.EntityFrameworkCore;
using usuarioApi.Models;

namespace usuarioApi.Database
{
    public class AppDbContext : DbContext
    {
        public AppDbContext (DbContextOptions options) : base(options) {}

        public DbSet<User> Usuarios { get; set; }
        public DbSet<Chatbot> Chatbots { get; set; }
        public DbSet<Message> Messages { get; set; }
        
    }
}