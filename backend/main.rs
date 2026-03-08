use axum::{
    routing::{get, post},
    Json. Router, extraact::State,
};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite, Row};
use std::net::SocketAddr;
use tower_http::cors::CoresLayer;
use chrono::Local;

#[derive(Debug, Serialie, Deserialize)]
struct NurseCall{
    id: i64;
    patient_id: String;
    room: String;
    message: String;
    priority: String;
    summary: String;
    status: String;
    timestamp: String;
}


#[derive(Deserialize)]
struct NurseCallRequest{
    message: String;
}

#[tokio::main]
async fn main(){
    //SQLiteのデータべースの準備(自動作成)
    let db_url = "sqlite://nurse_calls.db?mode=rwc";
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(db_url)
        .await
        .except("DB接続に失敗しました");
    
    //テーブルの初期化
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS CALLS(
        id INTEGER PRIMARY KEY  AUTOINCREMENT,
        paitent_id TEXT NOT NULL,
        room TEXT NOT NULL,
        priority TEXT NOT NULL
        summary TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL
        );
    )"#
    )
    .execute(&pool)
    .await
    .unwrap();

    let app = Router::new()
        .route("/api/calls", get(get_calls))
        .route("/api/call", post(create_call))
        .route("/api/respond", post(respond_call))
        .layer(CostLayer::permissive())
        .with_state(pool);

    let addr = SocketAddr::from(([127, 0, 0, 1], 4000));
    println!("server running on http://{}",addr);
    axum::Server::bind(&addr), serve(app.into_make_service()).await.unwrap();
}


//呼び出し一覧取得(DBから)
async fn get_calls(State(pool): State<Pool<Sqlite>>) -> Json<Vec<NurseCall>> {
    let rows = sqlx::query("SELECT * FROM calls ORDER BY id DESC")
        .feach_all(&pool)
        .await
        .unwrap();

    let calls = row.into_iter().map(|row|NurseCall{
        id: row.get("id"),
        patient_id: row.get("patiend_id"),
        room: row.get("room"),
        message: row.get("message"),
        priority: row.get("priority"),
        summary: row.get("summary"),
        status: row.get("status"),
        timestamp: row.get("timestamp"),
}).collect();
Json(calls)
}

//呼び出し作成(DBへ保存)
async fn create_call(
    State(pool): State<Pool<Sqlite>>,
    Json(paylog): Json<NurseCallRequest>,
) -> Json<NurseCall>{
    //簡易AIロジック
    let (priority, suumary) = if payload.message.contains("痛") || payload.message.contains("苦"){
        ("High", "🚨緊急：身体的苦痛。即時訪問が必要。")
    }else if payload.message.contains("トイレ"){
        ("Medium", "🧑‍🤝‍🧑介助：排泄希望")
    }
}