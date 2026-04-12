# Swift XCTest

## File and naming conventions

```swift
// Test file — must end in Tests.swift or Tests
UserServiceTests.swift
UserServiceTests/
  UserServiceTests.swift

// Class and function naming
class UserServiceTests: XCTestCase {
    func testCreateUserReturnsID() { ... }           ✓
    func testLoginFailsWithWrongPassword() { ... }   ✓
    func testCreate() { ... }                        ✗ — not descriptive
    func createUser() { ... }                        ✗ — not collected (no test prefix)
}
```

## Assertions

```swift
// Basic
XCTAssertEqual(result, expected)
XCTAssertNotEqual(a, b)
XCTAssertTrue(condition)
XCTAssertFalse(condition)
XCTAssertNil(value)
XCTAssertNotNil(value)

// With messages
XCTAssertEqual(result, expected, "Login should return valid token")

// Throwing
XCTAssertThrowsError(try riskyOperation()) { error in
    XCTAssertEqual(error as? AppError, .invalidInput)
}
XCTAssertNoThrow(try safeOperation())
```

## Async tests

```swift
// Modern — async/await (Xcode 13.2+)
func testFetchUser() async throws {
    let user = try await userService.fetch(id: 1)
    XCTAssertEqual(user.id, 1)
}

// Legacy — XCTestExpectation for completion handlers
func testFetchUserWithCallback() {
    let expectation = expectation(description: "Fetch user completes")

    userService.fetch(id: 1) { result in
        switch result {
        case .success(let user):
            XCTAssertEqual(user.id, 1)
        case .failure(let error):
            XCTFail("Expected success, got \(error)")
        }
        expectation.fulfill()
    }

    waitForExpectations(timeout: 5)
}
```

**Flag:** `waitForExpectations` with no timeout, or timeout that's too long (> 10s suggests real network call).

## Setup and teardown

```swift
class UserServiceTests: XCTestCase {
    var sut: UserService!       // system under test
    var mockDB: MockDatabase!

    override func setUp() {
        super.setUp()
        mockDB = MockDatabase()
        sut = UserService(db: mockDB)
    }

    override func tearDown() {
        sut = nil
        mockDB = nil
        super.tearDown()
    }

    // Or use setUpWithError for throwing setup
    override func setUpWithError() throws {
        try super.setUpWithError()
        sut = try UserService(config: validConfig)
    }
}
```

## Mocking — protocol-based

```swift
// Define testable protocol
protocol EmailSending {
    func send(to: String, subject: String, body: String) throws
}

// Production implementation
class SMTPEmailSender: EmailSending { ... }

// Test mock
class MockEmailSender: EmailSending {
    var sentEmails: [(to: String, subject: String, body: String)] = []

    func send(to: String, subject: String, body: String) throws {
        sentEmails.append((to, subject, body))
    }
}

// In test
func testRegistrationSendsWelcomeEmail() throws {
    let emailSender = MockEmailSender()
    let service = UserService(emailSender: emailSender)

    try service.register(email: "alice@example.com")

    XCTAssertEqual(emailSender.sentEmails.count, 1)
    XCTAssertEqual(emailSender.sentEmails.first?.to, "alice@example.com")
}
```

## What to flag

- `XCTAssertNotNil(result)` as only assertion — no check on what result contains
- `waitForExpectations` with no matching `expectation.fulfill()` in all code paths
- Tests that import the production network layer without mocking
- Missing `tearDown` when `setUp` allocates resources
- Async test using `expectation` pattern when `async/await` available
- `XCTFail()` inside `if` without `else` — test passes if condition is false
