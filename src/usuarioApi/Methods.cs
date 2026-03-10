namespace usuarioApi.Methods
{
    public static class Methods
    {
        public static void Log(this string text, ConsoleColor color)
        {
            Console.ForegroundColor = color;
            Console.WriteLine(text);
            Console.ResetColor();
        }
    }
}