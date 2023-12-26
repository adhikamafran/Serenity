namespace Serenity.TypeScript;

readonly struct CommentDirective(TextRange range, CommentDirectiveType type)
{
    public readonly TextRange Range = range;
    public readonly CommentDirectiveType Type = type;
}