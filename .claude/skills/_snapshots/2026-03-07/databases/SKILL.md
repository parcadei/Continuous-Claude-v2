# Databases Skill

## Iron Law
NO database changes without query optimization check.

## PostgreSQL Patterns (Primary)

### Query Optimization
```yaml
Before Writing Queries:
  1. Check existing indexes
  2. Estimate row counts
  3. Consider query plan
  4. Avoid N+1 patterns

EXPLAIN ANALYZE:
  - Run on all new queries
  - Watch for Seq Scan on large tables
  - Check actual vs estimated rows
  - Identify missing indexes
```

### Index Guidelines
```yaml
Create Index When:
  - Column in WHERE clause frequently
  - Column in JOIN condition
  - Column in ORDER BY with LIMIT
  - Unique constraints needed

Avoid Index When:
  - Small tables (<1000 rows)
  - High write frequency
  - Low cardinality columns
  - Rarely queried columns

Types:
  B-tree: Default, equality and range
  Hash: Equality only
  GIN: Arrays, JSONB, full-text
  GiST: Geometric, full-text
```

### Connection Management
```yaml
Pool Settings:
  min: 2-5 connections
  max: 10-20 connections (CPU cores * 2 + disk spindles)
  idleTimeout: 10000ms
  connectionTimeout: 5000ms

Best Practices:
  - Always release connections
  - Use transactions appropriately
  - Avoid long-running transactions
  - Monitor connection counts
```

### Common Anti-Patterns
```yaml
Avoid:
  SELECT *              → Select specific columns
  No LIMIT on lists     → Always paginate
  String concatenation  → Use parameterized queries
  No indexes on FKs     → Index foreign keys
  N+1 queries          → Use JOINs or batch loading
  Missing transactions → Wrap related writes
```

### Schema Design
```yaml
Normalization:
  - 3NF for transactional data
  - Denormalize for read-heavy analytics
  - Use appropriate data types
  - Add constraints (NOT NULL, CHECK, FK)

Naming:
  - snake_case for tables/columns
  - Plural table names (users, orders)
  - Descriptive column names
  - Consistent timestamp naming (created_at, updated_at)
```

## Migration Safety
```yaml
Safe Operations:
  - ADD COLUMN (nullable or with default)
  - CREATE INDEX CONCURRENTLY
  - ADD CONSTRAINT with NOT VALID

Dangerous Operations:
  - DROP COLUMN (data loss)
  - ALTER COLUMN TYPE (locks table)
  - ADD COLUMN NOT NULL without default
  - CREATE INDEX (locks writes)

Always:
  - Test migrations on copy of prod data
  - Have rollback plan
  - Run during low-traffic periods
  - Monitor during execution
```

## Integration with SuperClaude
```yaml
Activation:
  - Database|Query|SQL|PostgreSQL keywords
  - Schema changes detected
  - Performance issues with DB
  - New entity creation

Persona Alignment:
  - backend persona primary
  - performance persona for optimization
  - architect persona for schema design
```

---
*ClaudeKit Skills | databases v1.0 | PostgreSQL-focused*
