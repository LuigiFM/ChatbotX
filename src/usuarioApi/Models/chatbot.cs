using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using OpenAI.Chat;

namespace usuarioApi.Models
{
    public class Message
    {
        [Key]
        [Required]
        [JsonIgnore]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [JsonPropertyName("role")]
        public string Role { get; set; }

        [Required]
        [JsonPropertyName("content")]
        public string Content { get; set; }

        [Required]
        [JsonIgnore]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public Guid ChatbotId { get; set; }

        [JsonIgnore]
        public Chatbot Chatbot { get; set; }
    }
    public class Chatbot
    {
        [Required]
        [JsonIgnore]
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [JsonIgnore]
        [StringLength(100, MinimumLength = 3)]
        public string Name { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 3)]
        [JsonPropertyName("model")]
        public string Model { get; set; }

        [Required]
        [JsonPropertyName("messages")]
        public List<Message> Messages{ get; set; }

        [Required]
        [JsonPropertyName("temperature")]
        public float Temperature { get; set; }

        [JsonIgnore]
        [JsonPropertyName("userid")]
        public Guid UserId { get; set; }

        [JsonIgnore]
        public User User { get; set; }




    }
}