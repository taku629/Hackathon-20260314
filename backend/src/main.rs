use axum::{
    routing::{get, post},
    Json, Router, extract::State,
};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite, Row};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct NurseCall {
    id: i64,
    patient_id: String,
    room: String,
    message: String,
    priority: String,
    summary: String,
    status: String,
    timestamp: String,
}

#[derive(Deserialize)]
struct NurseCallRequest {
    message: String,
}

#[tokio::main]
async fn main() {
    // SQLiteデータベースの準備（自動作成）
    let db_url = "sqlite://nurse_calls.db?mode=rwc";
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(db_url)
        .await
        .expect("DB接続に失敗しました");

    // テーブルの初期化
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            room TEXT NOT NULL,
            message TEXT NOT NULL,
            priority TEXT NOT NULL,
            summary TEXT NOT NULL,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    let app = Router::new()
        .route("/api/calls", get(get_calls))
        .route("/api/call", post(create_call))
        .route("/api/respond", post(respond_call))
        .layer(CorsLayer::permissive())
        .with_state(pool);

    let addr = SocketAddr::from(([127, 0, 0, 1], 4000));
    println!("Server running on http://{}", addr);
    axum::Server::bind(&addr).serve(app.into_make_service()).await.unwrap();
}

// 呼び出し一覧取得（DBから）
async fn get_calls(State(pool): State<Pool<Sqlite>>) -> Json<Vec<NurseCall>> {
    let rows = sqlx::query("SELECT * FROM calls ORDER BY id DESC")
        .fetch_all(&pool)
        .await
        .unwrap();

    let calls = rows.into_iter().map(|row| NurseCall {
        id: row.get("id"),
        patient_id: row.get("patient_id"),
        room: row.get("room"),
        message: row.get("message"),
        priority: row.get("priority"),
        summary: row.get("summary"),
        status: row.get("status"),
        timestamp: row.get("timestamp"),
    }).collect();

    Json(calls)
}

// 呼び出し作成（DBへ保存）
async fn create_call(
    State(pool): State<Pool<Sqlite>>,
    Json(payload): Json<NurseCallRequest>,
) -> Json<NurseCall> {
    // 簡易AIロジック
    let (priority, summary) = if payload.message.contains("痛") || payload.message.contains("苦") {
        ("High", "🚨 緊急：身体的苦痛。即時訪問が必要。")
    } else if payload.message.contains("トイレ") {
        ("Medium", "🚶 介助：排泄希望。")
    } else {
        ("Low", "📋 一般：用件の確認。")
    };

    let now = Local::now().format("%H:%M:%S").to_string();

    let result = sqlx::query(
        "INSERT INTO calls (patient_id, room, message, priority, summary, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind("拓夢 (Taku)")
    .bind("302")
    .bind(&payload.message)
    .bind(priority)
    .bind(summary)
    .bind("Waiting")
    .bind(&now)
    .execute(&pool)
    .await
    .unwrap();

    let new_call = NurseCall {
        id: result.last_insert_rowid(),
        patient_id: "拓夢 (Taku)".to_string(),
        room: "302".to_string(),
        message: payload.message,
        priority: priority.to_string(),
        summary: summary.to_string(),
        status: "Waiting".to_string(),
        timestamp: now,
    };

    Json(new_call)
}

// 対応ステータスの更新
async fn respond_call(State(pool): State<Pool<Sqlite>>, Json(id): Json<i64>) -> Json<bool> {
    let result = sqlx::query("UPDATE calls SET status = 'Responding' WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .unwrap();
    
    Json(result.rows_affected() > 0)
}