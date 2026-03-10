using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using usuarioApi.Database;
using usuarioApi.Methods;
using usuarioApi.Models;

namespace usuarioApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly AppDbContext _dbContext;

        public UsuariosController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
            
        }
        
        [HttpPost]
        public ActionResult<Guid> VerifyUsuario([FromBody] User usuario)
        {
            

            usuario = _dbContext.Usuarios.FirstOrDefault<User>(user => user.Usuario == usuario.Usuario && user.Senha == usuario.Senha);
            if(usuario == null) return NotFound();

            Console.WriteLine(JsonSerializer.Serialize<User>(usuario));
            
            $"O usuário {usuario.Usuario} (ID: {usuario.Id}) fez login".Log(ConsoleColor.Green);

            return Ok(usuario.Id);
        } 

        [HttpPost("create")]
        public async Task<ActionResult<Guid>> CreateUsuario([FromBody] User usuario)
        {
            if(usuario == null) return NotFound();
            if(_dbContext.Usuarios.Any<User>(user => user.Usuario == usuario.Usuario)) return Conflict();

            _dbContext.Usuarios.Add(usuario);
            
        
            await _dbContext.SaveChangesAsync();

            $"Foi criado o usuário {usuario.Usuario} (ID: {usuario.Id})".Log(ConsoleColor.Green);
            
            return Ok(usuario.Id);
        } 


        [HttpGet]
        public async Task<ActionResult<List<User>>> GetAllUsuarios()
        {
            var usuarios = await _dbContext.Usuarios.ToListAsync();

            $"Todos os usuários foram requisitados pelo método GET".Log(ConsoleColor.Green);
            return Ok(usuarios);
        }
    }
}