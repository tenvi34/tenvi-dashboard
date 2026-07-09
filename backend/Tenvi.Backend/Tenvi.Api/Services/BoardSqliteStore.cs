using System.Globalization;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Tenvi.Api.Models.Board;

namespace Tenvi.Api.Services;

// Board API의 영구 저장소: 서버 재시작 후에도 REMOTE 게시글을 유지하기 위한 SQLite 접근 계층
public class BoardSqliteStore
{
    private const string DataDirectoryName = "data";
    private const string DatabaseFileName = "tenvi.db";

    // blocks처럼 구조가 있는 필드는 SQLite TEXT 컬럼에 JSON 문자열로 보관
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string _databasePath;
    private readonly string _connectionString;
    private readonly ILogger<BoardSqliteStore> _logger;

    public BoardSqliteStore(IWebHostEnvironment environment, ILogger<BoardSqliteStore> logger)
    {
        _logger = logger;

        // ContentRootPath 기준이라 dotnet run 위치와 무관하게 Tenvi.Api/data/tenvi.db에 생성
        var dataDirectory = Path.Combine(environment.ContentRootPath, DataDirectoryName);
        Directory.CreateDirectory(dataDirectory);

        _databasePath = Path.Combine(dataDirectory, DatabaseFileName);
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _databasePath
        }.ToString();
    }

    public string DatabasePath => _databasePath;

    // 앱 시작 시 한 번 호출되어 DB 파일과 테이블을 준비. CREATE IF NOT EXISTS라 기존 데이터는 유지
    public void Initialize()
    {
        try
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();

            command.CommandText = """
                CREATE TABLE IF NOT EXISTS BoardPosts (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    blocksJson TEXT NOT NULL,
                    author TEXT NOT NULL,
                    categoryId TEXT NOT NULL,
                    isPinned INTEGER NOT NULL,
                    viewCount INTEGER NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    deletedAt TEXT NULL
                );
                """;

            command.ExecuteNonQuery();
            _logger.LogInformation("Board SQLite database is ready at {DatabasePath}", _databasePath);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Board SQLite database initialization failed at {DatabasePath}", _databasePath);
            throw;
        }
    }

    public List<BoardPost> GetPosts(bool includeDeleted)
    {
        try
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();

            // 휴지통과 일반 목록은 deletedAt 존재 여부로 나누며, 정렬은 기존 InMemory 규칙과 동일
            command.CommandText = includeDeleted
                ? """
                    SELECT * FROM BoardPosts
                    WHERE deletedAt IS NOT NULL
                    ORDER BY isPinned DESC, createdAt DESC;
                    """
                : """
                    SELECT * FROM BoardPosts
                    WHERE deletedAt IS NULL
                    ORDER BY isPinned DESC, createdAt DESC;
                    """;

            using var reader = command.ExecuteReader();
            var posts = new List<BoardPost>();

            while (reader.Read())
            {
                posts.Add(ReadPost(reader));
            }

            return posts;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Board posts query failed. IncludeDeleted: {IncludeDeleted}", includeDeleted);
            throw;
        }
    }

    public BoardPost? GetPost(string id)
    {
        try
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();

            command.CommandText = "SELECT * FROM BoardPosts WHERE id = $id LIMIT 1;";
            command.Parameters.AddWithValue("$id", id);

            using var reader = command.ExecuteReader();

            return reader.Read() ? ReadPost(reader) : null;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Board post query failed. Id: {PostId}", id);
            throw;
        }
    }

    public bool CreatePost(BoardPost post)
    {
        try
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();

            // LOCAL -> REMOTE 복사 재실행 시 같은 id는 PRIMARY KEY로 막고, 컨트롤러가 409로 응답
            command.CommandText = """
                INSERT OR IGNORE INTO BoardPosts (
                    id,
                    title,
                    content,
                    blocksJson,
                    author,
                    categoryId,
                    isPinned,
                    viewCount,
                    createdAt,
                    updatedAt,
                    deletedAt
                )
                VALUES (
                    $id,
                    $title,
                    $content,
                    $blocksJson,
                    $author,
                    $categoryId,
                    $isPinned,
                    $viewCount,
                    $createdAt,
                    $updatedAt,
                    $deletedAt
                );
                """;

            AddPostParameters(command, post);

            return command.ExecuteNonQuery() > 0;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Board post insert failed. Id: {PostId}", post.Id);
            throw;
        }
    }

    public bool UpdatePost(BoardPost post)
    {
        try
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();

            command.CommandText = """
                UPDATE BoardPosts
                SET title = $title,
                    content = $content,
                    blocksJson = $blocksJson,
                    author = $author,
                    categoryId = $categoryId,
                    isPinned = $isPinned,
                    viewCount = $viewCount,
                    createdAt = $createdAt,
                    updatedAt = $updatedAt,
                    deletedAt = $deletedAt
                WHERE id = $id;
                """;

            AddPostParameters(command, post);

            return command.ExecuteNonQuery() > 0;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Board post update failed. Id: {PostId}", post.Id);
            throw;
        }
    }

    public bool PermanentlyDeletePost(string id)
    {
        try
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();

            command.CommandText = "DELETE FROM BoardPosts WHERE id = $id;";
            command.Parameters.AddWithValue("$id", id);

            return command.ExecuteNonQuery() > 0;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Board post permanent delete failed. Id: {PostId}", id);
            throw;
        }
    }

    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();

        return connection;
    }

    // 컬럼과 모델의 연결을 한 곳에 모아 테이블 스키마 변경 시 수정 지점을 줄임
    private static void AddPostParameters(SqliteCommand command, BoardPost post)
    {
        command.Parameters.AddWithValue("$id", post.Id);
        command.Parameters.AddWithValue("$title", post.Title);
        command.Parameters.AddWithValue("$content", post.Content);
        command.Parameters.AddWithValue("$blocksJson", JsonSerializer.Serialize(post.Blocks, JsonOptions));
        command.Parameters.AddWithValue("$author", post.Author);
        command.Parameters.AddWithValue("$categoryId", post.CategoryId);
        command.Parameters.AddWithValue("$isPinned", post.IsPinned ? 1 : 0);
        command.Parameters.AddWithValue("$viewCount", post.ViewCount);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(post.CreatedAt));
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(post.UpdatedAt));
        command.Parameters.AddWithValue("$deletedAt", post.DeletedAt.HasValue ? FormatDateTime(post.DeletedAt.Value) : DBNull.Value);
    }

    private static BoardPost ReadPost(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        Title = reader.GetString(reader.GetOrdinal("title")),
        Content = reader.GetString(reader.GetOrdinal("content")),
        Blocks = ReadBlocks(reader.GetString(reader.GetOrdinal("blocksJson"))),
        Author = reader.GetString(reader.GetOrdinal("author")),
        CategoryId = reader.GetString(reader.GetOrdinal("categoryId")),
        IsPinned = reader.GetInt32(reader.GetOrdinal("isPinned")) == 1,
        ViewCount = reader.GetInt32(reader.GetOrdinal("viewCount")),
        CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt"))),
        UpdatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("updatedAt"))),
        DeletedAt = ReadNullableDateTime(reader, "deletedAt")
    };

    private static List<BoardBlock> ReadBlocks(string blocksJson)
    {
        try
        {
            return JsonSerializer.Deserialize<List<BoardBlock>>(blocksJson, JsonOptions) ?? [];
        }
        catch (JsonException)
        {
            // 저장된 JSON이 손상된 경우에도 게시글 전체 조회가 멈추지 않도록 빈 블록으로 복구
            return [];
        }
    }

    private static DateTimeOffset? ReadNullableDateTime(SqliteDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);

        return reader.IsDBNull(ordinal) ? null : ParseDateTime(reader.GetString(ordinal));
    }

    private static string FormatDateTime(DateTimeOffset value) => value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);

    private static DateTimeOffset ParseDateTime(string value) =>
        DateTimeOffset.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
}
