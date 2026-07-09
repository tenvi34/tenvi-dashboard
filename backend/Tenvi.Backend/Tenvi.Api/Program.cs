var builder = WebApplication.CreateBuilder(args);

// Controller 기반 API 사용
builder.Services.AddControllers();

// Board REMOTE 게시글을 SQLite 파일에 저장하는 싱글톤 저장소
builder.Services.AddSingleton<Tenvi.Api.Services.BoardSqliteStore>();
builder.Services.AddSingleton<Tenvi.Api.Services.TaskSqliteStore>();
builder.Services.AddSingleton<Tenvi.Api.Services.NoteSqliteStore>();

// React/Vite 프론트엔드 CORS 허용
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// OpenAPI 문서 생성
builder.Services.AddOpenApi();

var app = builder.Build();

// 서버 시작 시 DB 파일과 테이블을 준비. 이미 존재하는 데이터는 유지
app.Services.GetRequiredService<Tenvi.Api.Services.BoardSqliteStore>().Initialize();
app.Services.GetRequiredService<Tenvi.Api.Services.TaskSqliteStore>().Initialize();
app.Services.GetRequiredService<Tenvi.Api.Services.NoteSqliteStore>().Initialize();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// 개발 초기에는 HTTPS 리다이렉션 경고를 피하기 위해 잠시 비활성화
// app.UseHttpsRedirection();

app.UseCors("Frontend");

app.UseAuthorization();

app.MapControllers();

app.Run();
