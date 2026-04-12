# JUnit 5 (Kotlin / Java)

## File and naming conventions

```kotlin
// Kotlin
class UserServiceTest {
    @Test
    fun `creates user with valid data`() { ... }       ✓ — backtick names readable
    @Test
    fun createUserReturnsId() { ... }                   ✓
    @Test
    fun test1() { ... }                                 ✗
}

// Java
class UserServiceTest {
    @Test
    void createUser_ValidData_ReturnsId() { ... }       ✓
    @Test
    void givenValidEmail_whenRegister_thenSendsWelcome() { ... }  ✓
}
```

## Assertions — use AssertJ or Kotlin's assertk

```kotlin
// JUnit 5 built-in — OK but limited error messages
assertEquals(expected, actual)
assertTrue(condition)
assertNotNull(value)
assertThrows<IllegalArgumentException> { riskyFn() }

// AssertJ — better error messages and fluent API
assertThat(result).isEqualTo(expected)
assertThat(list).hasSize(3).contains(item)
assertThat(string).startsWith("Hello").endsWith("World")
assertThat(exception).isInstanceOf(ValidationException::class.java)
    .hasMessageContaining("invalid email")

// Kotlin assertk
assertThat(result).isEqualTo(expected)
assertThat(list).hasSize(3)
assertFailure { riskyFn() }.isInstanceOf(IllegalArgumentException::class)
```

## Test lifecycle

```kotlin
class UserServiceTest {
    private lateinit var service: UserService
    private lateinit var mockDb: MockDatabase

    @BeforeEach
    fun setUp() {
        mockDb = MockDatabase()
        service = UserService(mockDb)
    }

    @AfterEach
    fun tearDown() {
        mockDb.clear()
    }

    @BeforeAll  // companion object in Kotlin, static in Java
    companion object {
        @JvmStatic
        @BeforeAll
        fun setUpClass() {
            // One-time expensive setup (start test container, etc.)
        }
    }
}
```

## Parameterized tests

```kotlin
@ParameterizedTest
@CsvSource(
    "user@example.com, true",
    "invalid-email, false",
    "'', false",
    "user@, false"
)
fun `email validation`(email: String, expected: Boolean) {
    assertThat(validateEmail(email)).isEqualTo(expected)
}

// Or with method source for complex objects
@ParameterizedTest
@MethodSource("invalidEmailProvider")
fun `rejects invalid emails`(email: String) {
    assertThrows<ValidationException> { validateEmail(email) }
}

companion object {
    @JvmStatic
    fun invalidEmailProvider() = listOf("", "noatsign", "@nodomain")
}
```

## Mocking with Mockito / MockK

```kotlin
// MockK (Kotlin-native, preferred for Kotlin)
val mockEmailSender = mockk<EmailSender>()
every { mockEmailSender.send(any(), any()) } returns Unit

service.register("alice@example.com")

verify { mockEmailSender.send("alice@example.com", any()) }

// Capturing arguments
val slot = slot<String>()
verify { mockEmailSender.send(capture(slot), any()) }
assertThat(slot.captured).isEqualTo("alice@example.com")
```

## Coroutines testing

```kotlin
// Requires: kotlinx-coroutines-test
@Test
fun `fetches user asynchronously`() = runTest {
    val user = userService.fetchUser(1)
    assertThat(user.id).isEqualTo(1)
}

// Testing with TestCoroutineScheduler for time control
@Test
fun `retries after delay`() = runTest {
    val result = async { operationWithRetry() }
    advanceTimeBy(3_000)   // fast-forward 3 seconds
    assertThat(result.await()).isEqualTo(expected)
}
```

## What to flag

- `assertEquals(expected, actual)` argument order swapped — JUnit is `(expected, actual)`, easy to get wrong
- `@Test` method not `void` / not returning `Unit` — silently not run in some versions
- Tests depending on `@BeforeAll` state that could be corrupted by a failing test
- `Mockito.mock()` instead of MockK for Kotlin code — works but less idiomatic
- Missing `runTest` on suspend test functions — coroutine never actually runs
