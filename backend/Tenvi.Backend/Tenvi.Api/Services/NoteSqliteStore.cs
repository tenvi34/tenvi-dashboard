using System.Globalization;
using Microsoft.Data.Sqlite;
using Tenvi.Api.Models.Notes;

namespace Tenvi.Api.Services;

// Notes SQLite 저장소
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

        // DB 파일 경로 준비
        var dataDirectory = Path.Combine(environment.ContentRootPath, DataDirectoryName);
        Directory.CreateDirectory(dataDirectory);

        _databasePath = Path.Combine(dataDirectory, DatabaseFileName);
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _databasePath
        }.ToString();
    }

    public string DatabasePath => _databasePath;

    // Notes 테이블 초기화
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

    // 삭제되지 않은 Note 목록 조회
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

    // Note 단건 조회
    public NoteItem? GetNote(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM Notes WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadNote(reader) : null;
    }

    // Note 생성
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

    // Note 전체 필드 갱신
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

    // SQLite 연결 열기
    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();

        return connection;
    }

    // Note SQL 파라미터 매핑
    private static void AddNoteParameters(SqliteCommand command, NoteItem note)
    {
        command.Parameters.AddWithValue("$id", note.Id);
        command.Parameters.AddWithValue("$title", note.Title);
        command.Parameters.AddWithValue("$content", note.Content);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(note.CreatedAt));
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(note.UpdatedAt));
        command.Parameters.AddWithValue("$deletedAt", note.DeletedAt.HasValue ? FormatDateTime(note.DeletedAt.Value) : DBNull.Value);
    }

    // SQLite row Note 모델 변환
    private static NoteItem ReadNote(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        Title = reader.GetString(reader.GetOrdinal("title")),
        Content = reader.GetString(reader.GetOrdinal("content")),
        CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt"))),
        UpdatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("updatedAt"))),
        DeletedAt = ReadNullableDateTime(reader, "deletedAt")
    };

    // nullable 날짜 컬럼 읽기
    private static DateTimeOffset? ReadNullableDateTime(SqliteDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);

        return reader.IsDBNull(ordinal) ? null : ParseDateTime(reader.GetString(ordinal));
    }

    // UTC ISO 문자열 변환
    private static string FormatDateTime(DateTimeOffset value) => value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);

    // ISO 문자열 DateTimeOffset 복원
    private static DateTimeOffset ParseDateTime(string value) =>
        DateTimeOffset.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
}
