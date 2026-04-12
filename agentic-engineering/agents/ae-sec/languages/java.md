# Java Security Guide

## SQL Injection

```java
// FLAG — string concatenation
Statement stmt = conn.createStatement();
stmt.execute("SELECT * FROM users WHERE id = " + userId);
stmt.execute("SELECT * FROM users WHERE name = '" + name + "'");

// FLAG — string format
String query = String.format("SELECT * FROM users WHERE name = '%s'", name);

// Safe — PreparedStatement
PreparedStatement stmt = conn.prepareStatement(
    "SELECT * FROM users WHERE id = ?");
stmt.setInt(1, userId);

// Safe — Spring JdbcTemplate
jdbcTemplate.query("SELECT * FROM users WHERE id = ?",
    new Object[]{userId}, rowMapper);

// Safe — JPA/Hibernate named parameters
TypedQuery<User> query = em.createQuery(
    "SELECT u FROM User u WHERE u.id = :id", User.class);
query.setParameter("id", userId);
```

## OS Command Injection

```java
// FLAG
Runtime.getRuntime().exec("ls " + userInput);
Runtime.getRuntime().exec(new String[]{"sh", "-c", "ls " + userInput});

// Safe
Runtime.getRuntime().exec(new String[]{"ls", userInput});
ProcessBuilder pb = new ProcessBuilder("ls", userInput);
```

## Deserialization

```java
// FLAG — Java native deserialization from user input
ObjectInputStream ois = new ObjectInputStream(request.getInputStream());
Object obj = ois.readObject();   // RCE with gadget chains

// Safe — use serialization filters (Java 9+)
ObjectInputStream ois = new ObjectInputStream(inputStream);
ois.setObjectInputFilter(info -> {
    if (info.serialClass() != null &&
        !info.serialClass().getName().startsWith("com.myapp.")) {
        return ObjectInputFilter.Status.REJECTED;
    }
    return ObjectInputFilter.Status.ALLOWED;
});
```

## Path Traversal

```java
// FLAG — File construction with user input
File file = new File("/uploads/" + filename);      // traversal possible
new FileInputStream("/uploads/" + filename);

// Safe
Path base = Paths.get("/uploads").toRealPath();
Path target = base.resolve(filename).normalize();
if (!target.startsWith(base)) {
    throw new SecurityException("Path traversal");
}
```

## XXE

```java
// FLAG — default XML parsers allow XXE
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
DocumentBuilder db = dbf.newDocumentBuilder();
Document doc = db.parse(inputStream);  // XXE possible

// Safe — disable external entities
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
dbf.setExpandEntityReferences(false);
```

## Spring-specific

```java
// Mass assignment — @ModelAttribute without restriction
@PostMapping("/update")
public String update(@ModelAttribute User user) {  // user.role can be set by attacker
    userService.save(user);
}

// Safe — bind only specific fields
@InitBinder
public void initBinder(WebDataBinder binder) {
    binder.setAllowedFields("name", "email", "bio");
}

// SSRF via RestTemplate
@GetMapping("/fetch")
public String fetch(@RequestParam String url) {
    return restTemplate.getForObject(url, String.class);  // FLAG — SSRF
}

// SpEL injection
@Value("#{${userExpression}}")   // FLAG if userExpression from user input
// Spring Data JPA @Query with SpEL from user input
```
