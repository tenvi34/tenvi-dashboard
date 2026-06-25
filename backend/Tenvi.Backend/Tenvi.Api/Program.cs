var builder = WebApplication.CreateBuilder(args);

// Controller 기반 API 사용
builder.Services.AddControllers();

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