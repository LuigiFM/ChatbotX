using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace usuarioApi.Models
{
    [Keyless]
    public class WhatsappMessage
    {   
        [Required]
        public string text { get; set; }
    }
}