#  Kotlin / Java Bug Patterns

## Null pointer exceptions in Kotlin

```kotlin
// Platform types from Java — nullable, but Kotlin doesn't know
val name: String = javaObj.getName()   // could be null — NullPointerException
val name = javaObj.getName() ?: ""     // safe — provide default

// Smart cast invalidated by concurrent access
if (value != null) {
    // another thread could set value to null here
    println(value.length)   // compiler allows but NPE possible
}
```

## Java concurrency

```java
// Non-atomic check-then-act
if (!map.containsKey(key)) {
    map.put(key, value);   // race condition — another thread may insert between check and put
}
// Fix
map.putIfAbsent(key, value);   // atomic

// HashMap vs ConcurrentHashMap
HashMap<K,V> map = new HashMap<>();
// accessed from multiple threads — ConcurrentModificationException or data corruption
// Fix: ConcurrentHashMap or synchronization
```

## Resource management in Java

```java
// Stream not closed — resource leak
Files.lines(path).forEach(processLine);   // stream not closed

// Fix
try (Stream<String> lines = Files.lines(path)) {
    lines.forEach(processLine);
}

// Connection not closed
Connection conn = dataSource.getConnection();
conn.prepareStatement(sql).execute();
// Fix: try-with-resources
try (Connection conn = dataSource.getConnection();
     PreparedStatement stmt = conn.prepareStatement(sql)) {
    stmt.execute();
}
```
