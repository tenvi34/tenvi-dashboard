using System.Globalization;
using Microsoft.Data.Sqlite;
using Tenvi.Api.Models.Map;

namespace Tenvi.Api.Services;

// Map SQLite 저장소
public class MapSqliteStore
{
    private const string DataDirectoryName = "data";
    private const string DatabaseFileName = "tenvi.db";

    private readonly string _databasePath;
    private readonly string _connectionString;
    private readonly ILogger<MapSqliteStore> _logger;

    public MapSqliteStore(IWebHostEnvironment environment, ILogger<MapSqliteStore> logger)
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

    // Map 컬렉션/기록 테이블 초기화
    public void Initialize()
    {
        try
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();

            command.CommandText = """
                CREATE TABLE IF NOT EXISTS map_collections (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    startDate TEXT NOT NULL,
                    endDate TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS map_records (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    title TEXT NOT NULL,
                    memo TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    locationSource TEXT NOT NULL,
                    collectionId TEXT NULL,
                    originalFileName TEXT NOT NULL,
                    fileType TEXT NOT NULL,
                    takenAt TEXT NOT NULL,
                    previewDataUrl TEXT NOT NULL,
                    previewImageHeight INTEGER NOT NULL,
                    previewImageMimeType TEXT NOT NULL,
                    previewImageWidth INTEGER NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    deletedAt TEXT NULL
                );
                """;

            command.ExecuteNonQuery();
            _logger.LogInformation("Map SQLite tables are ready at {DatabasePath}", _databasePath);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Map SQLite initialization failed at {DatabasePath}", _databasePath);
            throw;
        }
    }

    // 컬렉션 최신순 조회
    public List<MapCollectionItem> GetCollections()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM map_collections ORDER BY createdAt DESC;";

        using var reader = command.ExecuteReader();
        var collections = new List<MapCollectionItem>();

        while (reader.Read())
        {
            collections.Add(ReadCollection(reader));
        }

        return collections;
    }

    // 컬렉션 단건 조회
    public MapCollectionItem? GetCollection(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM map_collections WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadCollection(reader) : null;
    }

    // 컬렉션 생성
    public bool CreateCollection(MapCollectionItem collection)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            INSERT OR IGNORE INTO map_collections (
                id,
                name,
                description,
                startDate,
                endDate,
                createdAt,
                updatedAt
            )
            VALUES (
                $id,
                $name,
                $description,
                $startDate,
                $endDate,
                $createdAt,
                $updatedAt
            );
            """;

        AddCollectionParameters(command, collection);

        return command.ExecuteNonQuery() > 0;
    }

    // 컬렉션 수정
    public bool UpdateCollection(MapCollectionItem collection)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            UPDATE map_collections
            SET name = $name,
                description = $description,
                startDate = $startDate,
                endDate = $endDate,
                createdAt = $createdAt,
                updatedAt = $updatedAt
            WHERE id = $id;
            """;

        AddCollectionParameters(command, collection);

        return command.ExecuteNonQuery() > 0;
    }

    // 컬렉션 삭제와 record 연결 해제
    public bool DeleteCollection(string id)
    {
        using var connection = OpenConnection();
        using var transaction = connection.BeginTransaction();

        using var unlinkCommand = connection.CreateCommand();
        unlinkCommand.Transaction = transaction;
        // 사진 record는 보존
        unlinkCommand.CommandText = """
            UPDATE map_records
            SET collectionId = NULL,
                updatedAt = $updatedAt
            WHERE collectionId = $id;
            """;
        unlinkCommand.Parameters.AddWithValue("$id", id);
        unlinkCommand.Parameters.AddWithValue("$updatedAt", FormatDateTime(DateTimeOffset.UtcNow));
        unlinkCommand.ExecuteNonQuery();

        using var deleteCommand = connection.CreateCommand();
        deleteCommand.Transaction = transaction;
        deleteCommand.CommandText = "DELETE FROM map_collections WHERE id = $id;";
        deleteCommand.Parameters.AddWithValue("$id", id);
        var deletedCount = deleteCommand.ExecuteNonQuery();

        transaction.Commit();

        return deletedCount > 0;
    }

    // 삭제되지 않은 사진 기록 조회
    public List<MapRecordItem> GetRecords()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            SELECT * FROM map_records
            WHERE deletedAt IS NULL
            ORDER BY createdAt DESC;
            """;

        using var reader = command.ExecuteReader();
        var records = new List<MapRecordItem>();

        while (reader.Read())
        {
            records.Add(ReadRecord(reader));
        }

        return records;
    }

    // 사진 기록 단건 조회
    public MapRecordItem? GetRecord(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM map_records WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadRecord(reader) : null;
    }

    // 사진 기록 생성
    public bool CreateRecord(MapRecordItem record)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            INSERT OR IGNORE INTO map_records (
                id,
                title,
                memo,
                latitude,
                longitude,
                locationSource,
                collectionId,
                originalFileName,
                fileType,
                takenAt,
                previewDataUrl,
                previewImageHeight,
                previewImageMimeType,
                previewImageWidth,
                createdAt,
                updatedAt,
                deletedAt
            )
            VALUES (
                $id,
                $title,
                $memo,
                $latitude,
                $longitude,
                $locationSource,
                $collectionId,
                $originalFileName,
                $fileType,
                $takenAt,
                $previewDataUrl,
                $previewImageHeight,
                $previewImageMimeType,
                $previewImageWidth,
                $createdAt,
                $updatedAt,
                $deletedAt
            );
            """;

        AddRecordParameters(command, record);

        return command.ExecuteNonQuery() > 0;
    }

    // 사진 기록 전체 필드 갱신
    public bool UpdateRecord(MapRecordItem record)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            UPDATE map_records
            SET title = $title,
                memo = $memo,
                latitude = $latitude,
                longitude = $longitude,
                locationSource = $locationSource,
                collectionId = $collectionId,
                originalFileName = $originalFileName,
                fileType = $fileType,
                takenAt = $takenAt,
                previewDataUrl = $previewDataUrl,
                previewImageHeight = $previewImageHeight,
                previewImageMimeType = $previewImageMimeType,
                previewImageWidth = $previewImageWidth,
                createdAt = $createdAt,
                updatedAt = $updatedAt,
                deletedAt = $deletedAt
            WHERE id = $id;
            """;

        AddRecordParameters(command, record);

        return command.ExecuteNonQuery() > 0;
    }

    // SQLite 연결 열기
    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();

        return connection;
    }

    // 컬렉션 SQL 파라미터 매핑
    private static void AddCollectionParameters(SqliteCommand command, MapCollectionItem collection)
    {
        command.Parameters.AddWithValue("$id", collection.Id);
        command.Parameters.AddWithValue("$name", collection.Name);
        command.Parameters.AddWithValue("$description", collection.Description);
        command.Parameters.AddWithValue("$startDate", collection.StartDate);
        command.Parameters.AddWithValue("$endDate", collection.EndDate);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(collection.CreatedAt));
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(collection.UpdatedAt));
    }

    // 사진 기록 SQL 파라미터 매핑
    private static void AddRecordParameters(SqliteCommand command, MapRecordItem record)
    {
        command.Parameters.AddWithValue("$id", record.Id);
        command.Parameters.AddWithValue("$title", record.Title);
        command.Parameters.AddWithValue("$memo", record.Memo);
        command.Parameters.AddWithValue("$latitude", record.Latitude);
        command.Parameters.AddWithValue("$longitude", record.Longitude);
        command.Parameters.AddWithValue("$locationSource", record.LocationSource);
        command.Parameters.AddWithValue("$collectionId", string.IsNullOrWhiteSpace(record.CollectionId) ? DBNull.Value : record.CollectionId);
        command.Parameters.AddWithValue("$originalFileName", record.OriginalFileName);
        command.Parameters.AddWithValue("$fileType", record.FileType);
        command.Parameters.AddWithValue("$takenAt", record.TakenAt);
        command.Parameters.AddWithValue("$previewDataUrl", record.PreviewDataUrl);
        command.Parameters.AddWithValue("$previewImageHeight", record.PreviewImageHeight);
        command.Parameters.AddWithValue("$previewImageMimeType", record.PreviewImageMimeType);
        command.Parameters.AddWithValue("$previewImageWidth", record.PreviewImageWidth);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(record.CreatedAt));
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(record.UpdatedAt));
        command.Parameters.AddWithValue("$deletedAt", record.DeletedAt.HasValue ? FormatDateTime(record.DeletedAt.Value) : DBNull.Value);
    }

    // SQLite row 컬렉션 모델 변환
    private static MapCollectionItem ReadCollection(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        Name = reader.GetString(reader.GetOrdinal("name")),
        Description = reader.GetString(reader.GetOrdinal("description")),
        StartDate = reader.GetString(reader.GetOrdinal("startDate")),
        EndDate = reader.GetString(reader.GetOrdinal("endDate")),
        CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt"))),
        UpdatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("updatedAt")))
    };

    // SQLite row 사진 기록 모델 변환
    private static MapRecordItem ReadRecord(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        Title = reader.GetString(reader.GetOrdinal("title")),
        Memo = reader.GetString(reader.GetOrdinal("memo")),
        Latitude = reader.GetDouble(reader.GetOrdinal("latitude")),
        Longitude = reader.GetDouble(reader.GetOrdinal("longitude")),
        LocationSource = reader.GetString(reader.GetOrdinal("locationSource")),
        CollectionId = ReadNullableString(reader, "collectionId"),
        OriginalFileName = reader.GetString(reader.GetOrdinal("originalFileName")),
        FileType = reader.GetString(reader.GetOrdinal("fileType")),
        TakenAt = reader.GetString(reader.GetOrdinal("takenAt")),
        PreviewDataUrl = reader.GetString(reader.GetOrdinal("previewDataUrl")),
        PreviewImageHeight = reader.GetInt32(reader.GetOrdinal("previewImageHeight")),
        PreviewImageMimeType = reader.GetString(reader.GetOrdinal("previewImageMimeType")),
        PreviewImageWidth = reader.GetInt32(reader.GetOrdinal("previewImageWidth")),
        CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt"))),
        UpdatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("updatedAt"))),
        DeletedAt = ReadNullableDateTime(reader, "deletedAt")
    };

    // nullable 문자열 컬럼 읽기
    private static string? ReadNullableString(SqliteDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);

        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

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
