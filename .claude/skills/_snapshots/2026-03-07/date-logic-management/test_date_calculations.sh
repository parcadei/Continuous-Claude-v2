#!/bin/bash

# Date Logic Management Skill - Test Suite
# Tests all date calculation patterns for accuracy

echo "======================================================================"
echo "Date Logic Management Skill - Test Suite"
echo "======================================================================"
echo ""
echo "Current Date: $(date +'%A, %B %d, %Y')"
echo ""

PASSED=0
FAILED=0

# Test function
test_calculation() {
    local test_name="$1"
    local expected_desc="$2"
    shift 2
    local cmd="$@"

    echo "----------------------------------------------------------------------"
    echo "TEST: $test_name"
    echo "----------------------------------------------------------------------"
    echo "Command: $cmd"
    echo ""

    result=$(eval "$cmd")
    echo "Result:"
    echo "$result"
    echo ""
    echo "Expected: $expected_desc"
    echo ""

    if [ -n "$result" ]; then
        echo "✓ PASS"
        ((PASSED++))
    else
        echo "✗ FAIL - No result returned"
        ((FAILED++))
    fi
    echo ""
}

# Test 1: Yesterday
test_calculation \
    "Yesterday" \
    "Previous day" \
    'date -d "yesterday" +"%Y-%m-%dT00:00:00Z" && date -d "yesterday" +"%Y-%m-%dT23:59:59Z"'

# Test 2: Today
test_calculation \
    "Today" \
    "Current day" \
    'date -d "today" +"%Y-%m-%dT00:00:00Z" && date -d "today" +"%Y-%m-%dT23:59:59Z"'

# Test 3: Tomorrow
test_calculation \
    "Tomorrow" \
    "Next day" \
    'date -d "tomorrow" +"%Y-%m-%dT00:00:00Z" && date -d "tomorrow" +"%Y-%m-%dT23:59:59Z"'

# Test 4: Last Week (Work Week)
test_calculation \
    "Last Week (Work Week Mon-Fri)" \
    "Previous Monday to Friday" \
    'CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d"); LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d"); LAST_WEEK_FRIDAY=$(date -d "$LAST_WEEK_MONDAY +4 days" +"%Y-%m-%d"); echo "${LAST_WEEK_MONDAY}T00:00:00Z"; echo "${LAST_WEEK_FRIDAY}T23:59:59Z"; echo "Start: $(date -d "$LAST_WEEK_MONDAY" +"%A, %B %d, %Y")"; echo "End: $(date -d "$LAST_WEEK_FRIDAY" +"%A, %B %d, %Y")"'

# Test 5: Last Week (Calendar Week)
test_calculation \
    "Last Week (Calendar Week Mon-Sun)" \
    "Previous Monday to Sunday" \
    'CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d"); LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d"); LAST_WEEK_SUNDAY=$(date -d "$LAST_WEEK_MONDAY +6 days" +"%Y-%m-%d"); echo "${LAST_WEEK_MONDAY}T00:00:00Z"; echo "${LAST_WEEK_SUNDAY}T23:59:59Z"; echo "Start: $(date -d "$LAST_WEEK_MONDAY" +"%A, %B %d, %Y")"; echo "End: $(date -d "$LAST_WEEK_SUNDAY" +"%A, %B %d, %Y")"'

# Test 6: This Week (Work Week)
test_calculation \
    "This Week (Work Week Mon-Fri)" \
    "Current Monday to Friday" \
    'THIS_MONDAY=$(date -d "last monday" +"%Y-%m-%d"); THIS_FRIDAY=$(date -d "$THIS_MONDAY +4 days" +"%Y-%m-%d"); echo "${THIS_MONDAY}T00:00:00Z"; echo "${THIS_FRIDAY}T23:59:59Z"; echo "Start: $(date -d "$THIS_MONDAY" +"%A, %B %d, %Y")"; echo "End: $(date -d "$THIS_FRIDAY" +"%A, %B %d, %Y")"'

# Test 7: Last Tuesday
test_calculation \
    "Last Tuesday (Tuesday of Last Week)" \
    "Tuesday of previous week" \
    'CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d"); LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d"); LAST_TUESDAY=$(date -d "$LAST_WEEK_MONDAY +1 day" +"%Y-%m-%d"); echo "${LAST_TUESDAY}T00:00:00Z"; echo "${LAST_TUESDAY}T23:59:59Z"; echo "Date: $(date -d "$LAST_TUESDAY" +"%A, %B %d, %Y")"'

# Test 8: This Month
test_calculation \
    "This Month" \
    "First to last day of current month" \
    'MONTH_START=$(date -d "$(date +%Y-%m-01)" +"%Y-%m-%dT00:00:00Z"); MONTH_END=$(date -d "$(date +%Y-%m-01) +1 month -1 day" +"%Y-%m-%dT23:59:59Z"); echo "$MONTH_START"; echo "$MONTH_END"; echo "Start: $(date -d "$MONTH_START" +"%B %d, %Y")"; echo "End: $(date -d "$MONTH_END" +"%B %d, %Y")"'

# Test 9: Last Month
test_calculation \
    "Last Month" \
    "Previous month" \
    'LAST_MONTH_START=$(date -d "$(date +%Y-%m-01) -1 month" +"%Y-%m-%dT00:00:00Z"); LAST_MONTH_END=$(date -d "$(date +%Y-%m-01) -1 day" +"%Y-%m-%dT23:59:59Z"); echo "$LAST_MONTH_START"; echo "$LAST_MONTH_END"; echo "Start: $(date -d "$LAST_MONTH_START" +"%B %d, %Y")"; echo "End: $(date -d "$LAST_MONTH_END" +"%B %d, %Y")"'

# Test 10: Q4
test_calculation \
    "Q4 (Oct-Dec)" \
    "October 1 to December 31" \
    'Q4_START="$(date +%Y)-10-01T00:00:00Z"; Q4_END="$(date +%Y)-12-31T23:59:59Z"; echo "$Q4_START"; echo "$Q4_END"'

# Summary
echo "======================================================================"
echo "TEST SUMMARY"
echo "======================================================================"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✓ ALL TESTS PASSED"
    exit 0
else
    echo "✗ SOME TESTS FAILED"
    exit 1
fi
