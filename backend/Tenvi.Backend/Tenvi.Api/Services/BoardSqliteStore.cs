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

                CREATE TABLE IF NOT EXISTS board_categories (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    name TEXT NOT NULL,
                    isDefault INTEGER NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS board_images (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    dataUrl TEXT NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    size INTEGER NOT NULL,
                    width INTEGER NOT NULL,
                    height INTEGER NOT NULL,
                    createdAt TEXT NOT NULL
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

    public List<BoardCategory> GetCategories()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM board_categories ORDER BY isDefault DESC, createdAt ASC;";

        using var reader = command.ExecuteReader();
        var categories = new List<BoardCategory>();

        while (reader.Read())
        {
            categories.Add(ReadCategory(reader));
        }

        return categories;
    }

    public BoardCategory? GetCategory(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM board_categories WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadCategory(reader) : null;
    }

    public bool CreateCategory(BoardCategory category)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            INSERT OR IGNORE INTO board_categories (
                id,
                name,
                isDefault,
                createdAt,
                updatedAt
            )
            VALUES (
                $id,
                $name,
                $isDefault,
                $createdAt,
                $updatedAt
            );
            """;
        AddCategoryParameters(command, category);

        return command.ExecuteNonQuery() > 0;
    }

    public bool UpdateCategory(BoardCategory category)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            UPDATE board_categories
            SET name = $name,
                isDefault = $isDefault,
                createdAt = $createdAt,
                updatedAt = $updatedAt
            WHERE id = $id;
            """;
        AddCategoryParameters(command, category);

        return command.ExecuteNonQuery() > 0;
    }

    public bool DeleteCategory(string id)
    {
        using var connection = OpenConnection();
        using var transaction = connection.BeginTransaction();

        using var updatePostsCommand = connection.CreateCommand();
        updatePostsCommand.Transaction = transaction;
        updatePostsCommand.CommandText = """
            UPDATE BoardPosts
            SET categoryId = 'general',
                updatedAt = $updatedAt
            WHERE categoryId = $id;
            """;
        updatePostsCommand.Parameters.AddWithValue("$id", id);
        updatePostsCommand.Parameters.AddWithValue("$updatedAt", FormatDateTime(DateTimeOffset.UtcNow));
        updatePostsCommand.ExecuteNonQuery();

        using var deleteCommand = connection.CreateCommand();
        deleteCommand.Transaction = transaction;
        deleteCommand.CommandText = "DELETE FROM board_categories WHERE id = $id;";
        deleteCommand.Parameters.AddWithValue("$id", id);
        var deletedCount = deleteCommand.ExecuteNonQuery();

        transaction.Commit();

        return deletedCount > 0;
    }

    public List<BoardImage> GetImages()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM board_images ORDER BY createdAt DESC;";

        using var reader = command.ExecuteReader();
        var images = new List<BoardImage>();

        while (reader.Read())
        {
            images.Add(ReadImage(reader));
        }

        return images;
    }

    public BoardImage? GetImage(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM board_images WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadImage(reader) : null;
    }

    public bool CreateImage(BoardImage image)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        // TODO: 이미지가 커지면 SQLite TEXT 대신 파일/오브젝트 저장소 분리 검토
        command.CommandText = """
            INSERT OR IGNORE INTO board_images (
                id,
                dataUrl,
                name,
                type,
                size,
                width,
                height,
                createdAt
            )
            VALUES (
                $id,
                $dataUrl,
                $name,
                $type,
                $size,
                $width,
                $height,
                $createdAt
            );
            """;
        AddImageParameters(command, image);

        return command.ExecuteNonQuery() > 0;
    }

    public bool DeleteImage(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "DELETE FROM board_images WHERE id = $id;";
        command.Parameters.AddWithValue("$id", id);

        return command.ExecuteNonQuery() > 0;
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

    private static void AddCategoryParameters(SqliteCommand command, BoardCategory category)
    {
        command.Parameters.AddWithValue("$id", category.Id);
        command.Parameters.AddWithValue("$name", category.Name);
        command.Parameters.AddWithValue("$isDefault", category.IsDefault ? 1 : 0);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(category.CreatedAt));
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(category.UpdatedAt));
    }

    private static void AddImageParameters(SqliteCommand command, BoardImage image)
    {
        command.Parameters.AddWithValue("$id", image.Id);
        command.Parameters.AddWithValue("$dataUrl", image.DataUrl);
        command.Parameters.AddWithValue("$name", image.Name);
        command.Parameters.AddWithValue("$type", image.Type);
        command.Parameters.AddWithValue("$size", image.Size);
        command.Parameters.AddWithValue("$width", image.Width);
        command.Parameters.AddWithValue("$height", image.Height);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(image.CreatedAt));
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

    private static BoardCategory ReadCategory(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        Name = reader.GetString(reader.GetOrdinal("name")),
        IsDefault = reader.GetInt32(reader.GetOrdinal("isDefault")) == 1,
        CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt"))),
        UpdatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("updatedAt")))
    };

    private static BoardImage ReadImage(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        DataUrl = reader.GetString(reader.GetOrdinal("dataUrl")),
        Name = reader.GetString(reader.GetOrdinal("name")),
        Type = reader.GetString(reader.GetOrdinal("type")),
        Size = reader.GetInt64(reader.GetOrdinal("size")),
        Width = reader.GetInt32(reader.GetOrdinal("width")),
        Height = reader.GetInt32(reader.GetOrdinal("height")),
        CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt")))
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
