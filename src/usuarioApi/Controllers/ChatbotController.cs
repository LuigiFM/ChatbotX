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
using Google.GenAI;
using Google.GenAI.Types;
using Newtonsoft.Json.Linq;
using Microsoft.AspNetCore.Http.HttpResults;
using System.Runtime.InteropServices.JavaScript;

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


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteChatBot(Guid id)
        {
            Chatbot chatbot = _dbContext.Chatbots.FirstOrDefault(x => x.Id == id);

            if(chatbot == null) return NotFound("oxe");

            _dbContext.Chatbots.Remove(chatbot);

            await _dbContext.SaveChangesAsync();

            return Ok();
        }
        [HttpPost]
        public async Task<IActionResult> RegisterChatbot([FromBody] Chatbot chatbot)
        {

            foreach (Message msg in chatbot.Messages.OrderByDescending(m => m.CreatedAt))
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

        public async Task<string> ActionChatBot(Guid id)
        {

            Chatbot chatbot = await _dbContext.Chatbots
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == id);

            if(chatbot == null) return "Esse chatbot não existe. Erro 404.";

            var APIKey = System.Environment.GetEnvironmentVariable("GEMINI_API_KEY");
            var client = new Client(apiKey: APIKey);

            Guid chatId = chatbot.Messages.OrderByDescending(c => c.CreatedAt).FirstOrDefault().ChatId;

            var messages = new List<Content>();

            foreach(Message message in chatbot.Messages
            .Where(c => c.ChatId == chatId)
            .OrderBy(m => m.CreatedAt))
        
            {
                switch (message.Role)
                {
                    case "user":
                        messages.Add(new Content
                        {
                            Role = "user",
                            Parts = [ new Part { Text = message.Content } ]
                        });
                        break;   
                    case "model":
                        messages.Add(new Content
                        {
                            Role = "model",
                            Parts = [ new Part { Text = message.Content } ]
                        });
                        break;
                }               
            };

            GenerateContentConfig options = new GenerateContentConfig
            {
                Temperature = chatbot.Temperature ,
                SystemInstruction = new Content{
                    Parts = new List<Part>{
                        new Part { Text = chatbot.Messages.Where(m => m.Role == "system").Select(m => m.Content).LastOrDefault()}
                    }

                    }
            };        
            var response = await client.Models.GenerateContentAsync(
                model: chatbot.Model,
                contents: messages,
                config: options
            );


            if(response != null && response.Candidates.Count > 0) 
            {
                var content = response.Candidates.FirstOrDefault().Content.Parts.FirstOrDefault().Text;

                if(String.IsNullOrWhiteSpace(content)) return "A IA não retornou nada.";
                //await SendMessage(new WhatsappMessage { text = content });

                _dbContext.Messages.Add(new Message
                {
                    Role = "model",
                    Content = content,
                    ChatbotId = chatbot.Id,
                    ChatId = chatId
                });

                await _dbContext.SaveChangesAsync();
            
                return content;
                }
            else return "A IA não retornou nada.";

            
        }

    
        [HttpPost("whatsapp")]
        public async Task<IActionResult> SendMessage(WhatsappMessage msg)
        {

            var whatsappToken = System.Environment.GetEnvironmentVariable("META_API_KEY");
            var phoneNumberId = System.Environment.GetEnvironmentVariable("PHONE_NUMBER_ID");
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


        [HttpPost("webhook")]
        public async Task<IActionResult> ReadMessageWhatsapp([FromBody] Chat chat)
        {   
            //Associar 
            Guid chatbotId = Guid.Parse(chat.ChatbotId.ToString());
            Guid chatId = Guid.Parse(chat.Id.ToString());
            Message message = 
                new Message
                {
                    Content = chat.text.ToString(),
                    Role = "user",
                    ChatbotId = chatbotId,
                    ChatId = chatId
                    
                };

            _dbContext.Messages.Add(message);
            await _dbContext.SaveChangesAsync();

            string response = await ActionChatBot(chatbotId);



            /*if(String.IsNullOrWhiteSpace(geminiResponse))
            {
                geminiResponse = response.Value;
            }
            if(String.IsNullOrWhiteSpace(geminiResponse = response.Value)) return BadRequest($"{JsonSerializer.Serialize(response)}\n{JsonSerializer.Serialize(okObject)}\n{geminiResponse}");  
            */
            return Ok(response);

        }

        /*
            [HttpGet("webhook")]
            public async Task<IActionResult> ReadMessageWhatsapp([FromBody] JObject messages)
        {   
            //Associar 
            Chatbot chatbot = await _dbContext.Chatbots.FindAsync();

            if(chatbot == null) return NotFound();


            await _dbContext.SaveChangesAsync();
            return Ok();

        }
        
        */

        
        /*[HttpGet("webhook")]
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

        */


    }

    
}