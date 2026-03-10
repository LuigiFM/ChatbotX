using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace usuarioApi.Models
{
    public class User
    {
        [Key]
        [Required]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string Usuario { get; set; }

        [Required]
        [PasswordPropertyText]
        [StringLength(50, MinimumLength = 5)]
        public string Senha { get; set; }

        [JsonPropertyName("chatbots")]
        public List<Chatbot> Chatbots { get; set; }

    }
}