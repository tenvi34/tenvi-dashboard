using System.Globalization;
using Microsoft.Data.Sqlite;
using Tenvi.Api.Models.Tasks;

namespace Tenvi.Api.Services;

public class TaskSqliteStore
{
    private const string DataDirectoryName = "data";
    private const string DatabaseFileName = "tenvi.db";

    private readonly string _databasePath;
    private readonly string _connectionString;
    private readonly ILogger<TaskSqliteStore> _logger;

    public TaskSqliteStore(IWebHostEnvironment environment, ILogger<TaskSqliteStore> logger)
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
                CREATE TABLE IF NOT EXISTS Tasks (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    title TEXT NOT NULL,
                    dueDate TEXT NOT NULL,
                    completed INTEGER NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    deletedAt TEXT NULL
                );
                """;

            command.ExecuteNonQuery();
            _logger.LogInformation("Tasks SQLite table is ready at {DatabasePath}", _databasePath);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Tasks SQLite initialization failed at {DatabasePath}", _databasePath);
            throw;
        }
    }

    public List<TaskItem> GetTasks()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            SELECT * FROM Tasks
            WHERE deletedAt IS NULL
            ORDER BY createdAt DESC;
            """;

        using var reader = command.ExecuteReader();
        var tasks = new List<TaskItem>();

        while (reader.Read())
        {
            tasks.Add(ReadTask(reader));
        }

        return tasks;
    }

    public TaskItem? GetTask(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM Tasks WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadTask(reader) : null;
    }

    public bool CreateTask(TaskItem task)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            INSERT OR IGNORE INTO Tasks (
                id,
                title,
                dueDate,
                completed,
                createdAt,
                updatedAt,
                deletedAt
            )
            VALUES (
                $id,
                $title,
                $dueDate,
                $completed,
                $createdAt,
                $updatedAt,
                $deletedAt
            );
            """;

        AddTaskParameters(command, task);

        return command.ExecuteNonQuery() > 0;
    }

    public bool UpdateTask(TaskItem task)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            UPDATE Tasks
            SET title = $title,
                dueDate = $dueDate,
                completed = $completed,
                createdAt = $createdAt,
                updatedAt = $updatedAt,
                deletedAt = $deletedAt
            WHERE id = $id;
            """;

        AddTaskParameters(command, task);

        return command.ExecuteNonQuery() > 0;
    }

    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();

        return connection;
    }

    private static void AddTaskParameters(SqliteCommand command, TaskItem task)
    {
        command.Parameters.AddWithValue("$id", task.Id);
        command.Parameters.AddWithValue("$title", task.Title);
        command.Parameters.AddWithValue("$dueDate", task.DueDate);
        command.Parameters.AddWithValue("$completed", task.Completed ? 1 : 0);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(task.CreatedAt));
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(task.UpdatedAt));
        command.Parameters.AddWithValue("$deletedAt", task.DeletedAt.HasValue ? FormatDateTime(task.DeletedAt.Value) : DBNull.Value);
    }

    private static TaskItem ReadTask(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(reader.GetOrdinal("id")),
        Title = reader.GetString(reader.GetOrdinal("title")),
        DueDate = reader.GetString(reader.GetOrdinal("dueDate")),
        Completed = reader.GetInt32(reader.GetOrdinal("completed")) == 1,
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
