using System.Globalization;
using Microsoft.Data.Sqlite;
using Tenvi.Api.Models.Profile;

namespace Tenvi.Api.Services;

public class ProfileSqliteStore
{
    private const string DataDirectoryName = "data";
    private const string DatabaseFileName = "tenvi.db";

    private readonly string _databasePath;
    private readonly string _connectionString;
    private readonly ILogger<ProfileSqliteStore> _logger;

    public ProfileSqliteStore(IWebHostEnvironment environment, ILogger<ProfileSqliteStore> logger)
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
                CREATE TABLE IF NOT EXISTS profiles (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    nickname TEXT NOT NULL,
                    bio TEXT NOT NULL,
                    avatarImageId TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS profile_images (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    dataUrl TEXT NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    createdAt TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS app_settings (
                    key TEXT PRIMARY KEY COLLATE NOCASE,
                    valueJson TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                );
                """;

            command.ExecuteNonQuery();
            _logger.LogInformation("Profile SQLite tables are ready at {DatabasePath}", _databasePath);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Profile SQLite initialization failed at {DatabasePath}", _databasePath);
            throw;
        }
    }

    public UserProfile? GetProfile()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM profiles ORDER BY updatedAt DESC LIMIT 1;";

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadProfile(reader) : null;
    }

    public UserProfile UpsertProfile(UserProfile profile)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            INSERT INTO profiles (
                id,
                nickname,
                bio,
                avatarImageId,
                createdAt,
                updatedAt
            )
            VALUES (
                $id,
                $nickname,
                $bio,
                $avatarImageId,
                $createdAt,
                $updatedAt
            )
            ON CONFLICT(id) DO UPDATE SET
                nickname = excluded.nickname,
                bio = excluded.bio,
                avatarImageId = excluded.avatarImageId,
                createdAt = excluded.createdAt,
                updatedAt = excluded.updatedAt;
            """;
        AddProfileParameters(command, profile);
        command.ExecuteNonQuery();

        return profile;
    }

    public List<ProfileImage> GetImages()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM profile_images ORDER BY createdAt DESC;";

        using var reader = command.ExecuteReader();
        var images = new List<ProfileImage>();

        while (reader.Read())
        {
            images.Add(ReadImage(reader));
        }

        return images;
    }

    public ProfileImage? GetImage(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM profile_images WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadImage(reader) : null;
    }

    public bool CreateImage(ProfileImage image)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        // TODO: 프로필 이미지 용량 증가 시 파일 저장소 분리 검토
        command.CommandText = """
            INSERT OR IGNORE INTO profile_images (
                id,
                dataUrl,
                name,
                type,
                createdAt
            )
            VALUES (
                $id,
                $dataUrl,
                $name,
                $type,
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

        command.CommandText = "DELETE FROM profile_images WHERE id = $id;";
        command.Parameters.AddWithValue("$id", id);

        return command.ExecuteNonQuery() > 0;
    }

    public List<AppSetting> GetSettings()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM app_settings ORDER BY key ASC;";

        using var reader = command.ExecuteReader();
        var settings = new List<AppSetting>();

        while (reader.Read())
        {
            settings.Add(ReadSetting(reader));
        }

        return settings;
    }

    public AppSetting? GetSetting(string key)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM app_settings WHERE key = $key LIMIT 1;";
        command.Parameters.AddWithValue("$key", key);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadSetting(reader) : null;
    }

    public AppSetting UpsertSetting(AppSetting setting)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            INSERT INTO app_settings (
                key,
                valueJson,
                updatedAt
            )
            VALUES (
                $key,
                $valueJson,
                $updatedAt
            )
            ON CONFLICT(key) DO UPDATE SET
                valueJson = excluded.valueJson,
                updatedAt = excluded.updatedAt;
            """;
        AddSettingParameters(command, setting);
        command.ExecuteNonQuery();

        return setting;
    }

    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();

        return connection;
    }

    private static void AddProfileParameters(SqliteCommand command, UserProfile profile)
    {
        command.Parameters.AddWithValue("$id", profile.Id);
        command.Parameters.AddWithValue("$nickname", profile.Nickname);
        command.Parameters.AddWithValue("$bio", profile.Bio);
        command.Parameters.AddWithValue("$avatarImageId", profile.AvatarImageId);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(profile.CreatedAt));
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(profile.UpdatedAt));
    }

    private static void AddImageParameters(SqliteCommand command, ProfileImage image)
    {
        command.Parameters.AddWithValue("$id", image.Id);
        command.Parameters.AddWithValue("$dataUrl", image.DataUrl);
        command.Parameters.AddWithValue("$name", image.Name);
        command.Parameters.AddWithValue("$type", image.Type);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(image.CreatedAt));
    }

    private static void AddSettingParameters(SqliteCommand command, AppSetting setting)
    {
        command.Parameters.AddWithValue("$key", setting.Key);
        command.Parameters.AddWithValue("$valueJson", setting.ValueJson);
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(setting.UpdatedAt));
    }

    private static UserProfile ReadProfile(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        Nickname = reader.GetString(reader.GetOrdinal("nickname")),
        Bio = reader.GetString(reader.GetOrdinal("bio")),
        AvatarImageId = reader.GetString(reader.GetOrdinal("avatarImageId")),
        CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt"))),
        UpdatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("updatedAt")))
    };

    private static ProfileImage ReadImage(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        DataUrl = reader.GetString(reader.GetOrdinal("dataUrl")),
        Name = reader.GetString(reader.GetOrdinal("name")),
        Type = reader.GetString(reader.GetOrdinal("type")),
        CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt")))
    };

    private static AppSetting ReadSetting(SqliteDataReader reader) => new()
    {
        Key = reader.GetString(reader.GetOrdinal("key")),
        ValueJson = reader.GetString(reader.GetOrdinal("valueJson")),
        UpdatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("updatedAt")))
    };

    private static string FormatDateTime(DateTimeOffset value) => value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);

    private static DateTimeOffset ParseDateTime(string value) =>
        DateTimeOffset.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
}
