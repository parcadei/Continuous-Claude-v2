# Test Patterns

## Test Structure (AAA)

```python
def test_function_scenario_expected():
    # Arrange - set up test data
    user = User(name="test")
    
    # Act - perform the action
    result = user.greet()
    
    # Assert - verify the outcome
    assert result == "Hello, test"
```

## Common Patterns

### Testing Exceptions
```python
def test_divide_by_zero_raises_error():
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(10, 0)
```

### Testing Async
```python
@pytest.mark.asyncio
async def test_fetch_user_returns_data():
    user = await fetch_user(123)
    assert user.id == 123
```

### Parameterized Tests
```python
@pytest.mark.parametrize("input,expected", [
    (1, 1),
    (2, 4),
    (3, 9),
])
def test_square(input, expected):
    assert square(input) == expected
```

### Fixtures
```python
@pytest.fixture
def db_connection():
    conn = create_connection()
    yield conn
    conn.close()

def test_query(db_connection):
    result = db_connection.query("SELECT 1")
    assert result == 1
```

## TypeScript/Jest Patterns

```typescript
describe('UserService', () => {
  let service: UserService;
  
  beforeEach(() => {
    service = new UserService();
  });
  
  it('should create user with valid data', () => {
    const user = service.create({ name: 'Test' });
    expect(user.name).toBe('Test');
  });
  
  it('should throw on invalid email', () => {
    expect(() => service.create({ email: 'bad' }))
      .toThrow('Invalid email');
  });
});
```

## When to Use Mocks

**Use mocks for:**
- External APIs
- Databases (for unit tests)
- Time/date functions
- Random number generators

**Don't mock:**
- Business logic
- Simple data transformations
- Things you can test directly

## Test Organization

```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Tests with real dependencies
└── e2e/           # Full system tests
```
