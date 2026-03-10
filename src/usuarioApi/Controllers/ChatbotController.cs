using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using usuarioApi.Database;
using usuarioApi.Models;
using OpenAI;
using OpenAI.Responses;
using OpenAI.Models;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using OpenAI.Chat;
using OpenAI.Assistants;
using usuarioApi.Methods;
using System.Text;
using System.Net.Http.Headers;
using DotNetEnv;

#pragma warning disable OPENAI001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.

namespace usuarioApi.Controllers
{
    
    [ApiController]
    [Route("api/[controller]")]
    public class ChatbotController : ControllerBase
    {
        

        private readonly AppDbContext _dbContext;
        private readonly IHttpClientFactory _httpClientFactory;

        
        public ChatbotController(AppDbContext dbContext, IHttpClientFactory httpClientFactory)
        {
            _dbContext = dbContext;
            _httpClientFactory = httpClientFactory;
            
        
        }

        [HttpPost]
        public async Task<IActionResult> RegisterChatbot([FromBody] Chatbot chatbot)
        {

            foreach (Message msg in chatbot.Messages.OrderByDescending(m => m.CreatedAt).Take(15))
            {
                msg.ChatbotId = chatbot.Id;
            }


            Guid userId =  _dbContext.Usuarios.FirstOrDefault(u => u.Usuario == "admin" && u.Senha == "admin").Id;

            chatbot.UserId = userId;
            
            _dbContext.Chatbots.Add(chatbot);
           
            await _dbContext.SaveChangesAsync();

            return Ok(chatbot.Id);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Chatbot>> GetChatbot(Guid id)
        {
            
            Chatbot chatbot = await _dbContext.Chatbots
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == id);
            
            if(chatbot == null) return NotFound();
        
            return Ok(chatbot);
        }

        [HttpPost("{id}")]
        public async Task<IActionResult> ActionChatBot(Guid id)
        {

            Chatbot chatbot = await _dbContext.Chatbots
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == id);

            if(chatbot == null) return NotFound();

            var APIKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
            var client = new OpenAIClient(APIKey);

            var messages = new List<ChatMessage>();

            foreach(Message message in chatbot.Messages)
            {
                switch (message.Role)
                {
                    case "system":
                        messages.Add(new SystemChatMessage(message.Content));
                        break;
                    case "user":
                        messages.Add(new UserChatMessage(message.Content));
                        break;   
                    case "assistant":
                        messages.Add(new AssistantChatMessage(message.Content));
                        break;
                }               
            };

            ChatCompletionOptions options = new ChatCompletionOptions
            {
                Temperature = chatbot.Temperature    
            };

            var response = await client.GetChatClient(chatbot.Model).CompleteChatAsync(messages, options);
            
            

            if(response.Value.Content.Count > 0) 
            {
                var content = response.Value.Content.First();

                await SendMessage(new WhatsappMessage { text = content.Text });

                chatbot.Messages.Add(new Message()
                {
                    Role = "assistant",
                    Content = content.Text,
                    ChatbotId = chatbot.Id
                });

                await _dbContext.SaveChangesAsync();
            
                return Ok(content);
                }
            else return Ok("A IA não retornou nada.");

            
            
        }

    
        [HttpPost("zapzap")]
        public async Task<IActionResult> SendMessage(WhatsappMessage msg)
        {

            var whatsappToken = Environment.GetEnvironmentVariable("META_API_KEY");
            var phoneNumberId = Environment.GetEnvironmentVariable("PHONE_NUMBER_ID");
            string url = $"https://graph.facebook.com/v25.0/{phoneNumberId}/messages";

            var http = _httpClientFactory.CreateClient();
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", whatsappToken);

            var payload = new
            {
                messaging_product = "whatsapp",
                to = "55123456789",
                type = "template",
                template = new
                {
                    name = "hello_world",
                    language = new { code = "en_US" }
                }
            };

            string jsonPayload = JsonSerializer.Serialize(payload);
            StringContent content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var response = await http.PostAsync(url, content);
            string result = await response.Content.ReadAsStringAsync();

            return Ok(result);


        }


        [HttpPost("webhook/newmsg/{id}")]
        public async Task<IActionResult> ReadMessage(Guid id, [FromBody] Message message)
        {

            Chatbot chatbot = await _dbContext.Chatbots.FindAsync(id);

            if(chatbot == null) return NotFound();

            message.ChatbotId = chatbot.Id;
            _dbContext.Messages.Add(message);

            await _dbContext.SaveChangesAsync();
            return await ActionChatBot(id);

        }

        
        [HttpGet("webhook")]
            public IActionResult Verify(
                [FromQuery(Name = "hub.mode")] string mode,
                [FromQuery(Name = "hub.verify_token")] string token,
                [FromQuery(Name = "hub.challenge")] string challenge)
            {
                Console.WriteLine(challenge);
                if (mode == "subscribe" && token == "token4708") 
                {
                    
                    return Ok(challenge);
                }
 
                return Forbid();
            }

    }

    
}