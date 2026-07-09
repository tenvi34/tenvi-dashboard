using System.Globalization;
using Microsoft.Data.Sqlite;
using Tenvi.Api.Models.Notes;

namespace Tenvi.Api.Services;

public class NoteSqliteStore
{
    private const string DataDirectoryName = "data";
    private const string DatabaseFileName = "tenvi.db";

    private readonly string _databasePath;
    private readonly string _connectionString;
    private readonly ILogger<NoteSqliteStore> _logger;

    public NoteSqliteStore(IWebHostEnvironment environment, ILogger<NoteSqliteStore> logger)
    {
        _logger = logger;

        var dataDirectory = Path.Combine(environment.ContentRootPath, DataDirectoryName);
        Directory.CreateDirectory(dataDirectory);

        _databasePath = Path.Combine(dataDirectory, DatabaseFileName);
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _databasePath
        }.ToString();
    }

    public string DatabasePath => _databasePath;

    public void Initialize()
    {
        try
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();

            command.CommandText = """
                CREATE TABLE IF NOT EXISTS Notes (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    deletedAt TEXT NULL
                );
                """;

            command.ExecuteNonQuery();
            _logger.LogInformation("Notes SQLite table is ready at {DatabasePath}", _databasePath);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Notes SQLite initialization failed at {DatabasePath}", _databasePath);
            throw;
        }
    }

    public List<NoteItem> GetNotes()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            SELECT * FROM Notes
            WHERE deletedAt IS NULL
            ORDER BY createdAt DESC;
            """;

        using var reader = command.ExecuteReader();
        var notes = new List<NoteItem>();

        while (reader.Read())
        {
            notes.Add(ReadNote(reader));
        }

        return notes;
    }

    public NoteItem? GetNote(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM Notes WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadNote(reader) : null;
    }

    public bool CreateNote(NoteItem note)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            INSERT OR IGNORE INTO Notes (
                id,
                title,
                content,
                createdAt,
                updatedAt,
                deletedAt
            )
            VALUES (
                $id,
                $title,
                $content,
                $createdAt,
                $updatedAt,
                $deletedAt
            );
            """;

        AddNoteParameters(command, note);

        return command.ExecuteNonQuery() > 0;
    }

    public bool UpdateNote(NoteItem note)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            UPDATE Notes
            SET title = $title,
                content = $content,
                createdAt = $createdAt,
                updatedAt = $updatedAt,
                deletedAt = $deletedAt
            WHERE id = $id;
            """;

        AddNoteParameters(command, note);

        return command.ExecuteNonQuery() > 0;
    }

    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();

        return connection;
    }

    private static void AddNoteParameters(SqliteCommand command, NoteItem note)
    {
        command.Parameters.AddWithValue("$id", note.Id);
        command.Parameters.AddWithValue("$title", note.Title);
        command.Parameters.AddWithValue("$content", note.Content);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(note.CreatedAt));
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(note.UpdatedAt));
        command.Parameters.AddWithValue("$deletedAt", note.DeletedAt.HasValue ? FormatDateTime(note.DeletedAt.Value) : DBNull.Value);
    }

    private static NoteItem ReadNote(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        Title = reader.GetString(reader.GetOrdinal("title")),
        Content = reader.GetString(reader.GetOrdinal("content")),
        CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt"))),
        UpdatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("updatedAt"))),
        DeletedAt = ReadNullableDateTime(reader, "deletedAt")
    };

    private static DateTimeOffset? ReadNullableDateTime(SqliteDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);

        return reader.IsDBNull(ordinal) ? null : ParseDateTime(reader.GetString(ordinal));
    }

    private static string FormatDateTime(DateTimeOffset value) => value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);

    private static DateTimeOffset ParseDateTime(string value) =>
        DateTimeOffset.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
}
