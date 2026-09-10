# Rust Security Guide

## Memory Safety — What NOT to Flag

Rust's ownership system prevents:
- Buffer overflows
- Use-after-free
- Null pointer dereferences
- Double free
- Data races (in safe Rust)

**Do NOT report memory safety issues in safe Rust.** The compiler enforces them.

---

## unsafe Blocks

`unsafe` code bypasses Rust's safety guarantees. Review carefully:

```rust
unsafe {
    let ptr = user_input.as_ptr();          // raw pointer — check bounds
    std::slice::from_raw_parts(ptr, len)    // verify len comes from trusted source
    std::mem::transmute(value)              // type confusion — verify types compatible
}
```

**Flag:** `unsafe` blocks that dereference raw pointers derived from user-controlled length/offset values.

---

## SQL Injection

```rust
// Vulnerable — string formatting in query
sqlx::query(&format!("SELECT * FROM users WHERE id = {}", user_id))  // FLAG
conn.execute(&format!("DELETE FROM sessions WHERE token = '{}'", token))  // FLAG

// Safe — parameterized with sqlx
sqlx::query("SELECT * FROM users WHERE id = $1")
    .bind(user_id)
    .fetch_one(&pool)
    .await?;

// Safe — diesel ORM
users::table.filter(users::id.eq(user_id)).first(&conn)
```

---

## Command Injection

```rust
// Vulnerable — shell interpretation
Command::new("sh").arg("-c").arg(format!("ls {}", user_input))  // FLAG
Command::new("bash").arg("-c").arg(user_cmd)  // FLAG

// Safe — no shell, args as separate items
Command::new("ls").arg(user_input)  // SAFE — no shell interpretation
Command::new("grep").args(&[pattern, filename])  // SAFE
```

---

## Path Traversal

```rust
// Vulnerable — path joining doesn't prevent traversal
let path = Path::new("/uploads").join(user_filename);  // "../../../etc/passwd" works

// Safe
let base = Path::new("/uploads").canonicalize()?;
let target = base.join(user_filename).canonicalize()?;
if !target.starts_with(&base) {
    return Err(anyhow::anyhow!("Path traversal detected"));
}
```

Note: `canonicalize()` requires the path to exist. Use alternative for non-existent paths.

---

## Cryptography

```rust
// Weak random
use rand::Rng;
let token: u64 = rand::thread_rng().gen();  // SAFE for non-security use
// But for security tokens, use OsRng:

use rand::rngs::OsRng;
use rand::RngCore;
let mut bytes = [0u8; 32];
OsRng.fill_bytes(&mut bytes);  // SAFE — OS entropy

// Password hashing
use bcrypt::{hash, DEFAULT_COST};
let hashed = hash(password, DEFAULT_COST)?;  // SAFE

use argon2::{Argon2, PasswordHasher};
// SAFE — argon2 crate
```

---

## Deserialization

```rust
// Serde is generally safe — it doesn't execute arbitrary code
serde_json::from_str::<MyStruct>(&user_input)  // SAFE structurally

// But watch for logic issues after deserialization
#[derive(Deserialize)]
struct Config {
    role: String,  // user can set role: "admin" if not validated after deserializing
}
```

---

## TLS

```rust
// Disabled certificate verification
let connector = TlsConnector::builder()
    .danger_accept_invalid_certs(true)   // FLAG
    .danger_accept_invalid_hostnames(true)  // FLAG
    .build()?;

// reqwest
Client::builder()
    .danger_accept_invalid_certs(true)   // FLAG
    .build()?
```

---

## Actix-web / Axum specific

```rust
// SSRF
async fn fetch(Query(params): Query<HashMap<String, String>>) -> impl Responder {
    let url = params.get("url").unwrap();
    reqwest::get(url).await  // FLAG — SSRF
}

// Missing auth middleware
app.route("/admin/delete", web::post().to(delete_handler))  // check for auth middleware
```
