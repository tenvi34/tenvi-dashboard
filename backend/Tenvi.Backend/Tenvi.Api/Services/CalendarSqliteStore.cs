using System.Globalization;
using Microsoft.Data.Sqlite;
using Tenvi.Api.Models.Calendar;

namespace Tenvi.Api.Services;

public class CalendarSqliteStore
{
    private const string DataDirectoryName = "data";
    private const string DatabaseFileName = "tenvi.db";

    private readonly string _databasePath;
    private readonly string _connectionString;
    private readonly ILogger<CalendarSqliteStore> _logger;

    public CalendarSqliteStore(IWebHostEnvironment environment, ILogger<CalendarSqliteStore> logger)
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
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id TEXT PRIMARY KEY COLLATE NOCASE,
                    title TEXT NOT NULL,
                    memo TEXT NOT NULL,
                    startDate TEXT NOT NULL,
                    endDate TEXT NOT NULL,
                    color TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    deletedAt TEXT NULL
                );
                """;

            command.ExecuteNonQuery();
            _logger.LogInformation("Calendar SQLite table is ready at {DatabasePath}", _databasePath);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Calendar SQLite initialization failed at {DatabasePath}", _databasePath);
            throw;
        }
    }

    public List<CalendarEventItem> GetEvents()
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            SELECT * FROM calendar_events
            WHERE deletedAt IS NULL
            ORDER BY startDate ASC, createdAt ASC;
            """;

        using var reader = command.ExecuteReader();
        var events = new List<CalendarEventItem>();

        while (reader.Read())
        {
            events.Add(ReadEvent(reader));
        }

        return events;
    }

    public CalendarEventItem? GetEvent(string id)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = "SELECT * FROM calendar_events WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", id);

        using var reader = command.ExecuteReader();

        return reader.Read() ? ReadEvent(reader) : null;
    }

    public bool CreateEvent(CalendarEventItem calendarEvent)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            INSERT OR IGNORE INTO calendar_events (
                id,
                title,
                memo,
                startDate,
                endDate,
                color,
                createdAt,
                updatedAt,
                deletedAt
            )
            VALUES (
                $id,
                $title,
                $memo,
                $startDate,
                $endDate,
                $color,
                $createdAt,
                $updatedAt,
                $deletedAt
            );
            """;

        AddEventParameters(command, calendarEvent);

        return command.ExecuteNonQuery() > 0;
    }

    public bool UpdateEvent(CalendarEventItem calendarEvent)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();

        command.CommandText = """
            UPDATE calendar_events
            SET title = $title,
                memo = $memo,
                startDate = $startDate,
                endDate = $endDate,
                color = $color,
                createdAt = $createdAt,
                updatedAt = $updatedAt,
                deletedAt = $deletedAt
            WHERE id = $id;
            """;

        AddEventParameters(command, calendarEvent);

        return command.ExecuteNonQuery() > 0;
    }

    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();

        return connection;
    }

    private static void AddEventParameters(SqliteCommand command, CalendarEventItem calendarEvent)
    {
        command.Parameters.AddWithValue("$id", calendarEvent.Id);
        command.Parameters.AddWithValue("$title", calendarEvent.Title);
        command.Parameters.AddWithValue("$memo", calendarEvent.Memo);
        command.Parameters.AddWithValue("$startDate", calendarEvent.StartDate);
        command.Parameters.AddWithValue("$endDate", calendarEvent.EndDate);
        command.Parameters.AddWithValue("$color", calendarEvent.Color);
        command.Parameters.AddWithValue("$createdAt", FormatDateTime(calendarEvent.CreatedAt));
        command.Parameters.AddWithValue("$updatedAt", FormatDateTime(calendarEvent.UpdatedAt));
        command.Parameters.AddWithValue("$deletedAt", calendarEvent.DeletedAt.HasValue ? FormatDateTime(calendarEvent.DeletedAt.Value) : DBNull.Value);
    }

    private static CalendarEventItem ReadEvent(SqliteDataReader reader)
    {
        var startDate = reader.GetString(reader.GetOrdinal("startDate"));

        return new CalendarEventItem
        {
            Id = reader.GetString(reader.GetOrdinal("id")),
            Date = startDate,
            Title = reader.GetString(reader.GetOrdinal("title")),
            Memo = reader.GetString(reader.GetOrdinal("memo")),
            StartDate = startDate,
            EndDate = reader.GetString(reader.GetOrdinal("endDate")),
            Color = reader.GetString(reader.GetOrdinal("color")),
            CreatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("createdAt"))),
            UpdatedAt = ParseDateTime(reader.GetString(reader.GetOrdinal("updatedAt"))),
            DeletedAt = ReadNullableDateTime(reader, "deletedAt")
        };
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
